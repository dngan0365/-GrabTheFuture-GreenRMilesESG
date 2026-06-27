from calendar import monthrange
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.carbon import VEHICLE_PROFILES
from app.core.utils import day_end, day_start, parse_uuid
from app.models.reward import PredictionLog, RecommendationLog
from app.models.ride import Ride
from app.models.user import User


def _date_window(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    today = date.today()
    return from_date or today.replace(day=1), to_date or today


def _scope_conditions(user: User, from_date: date, to_date: date, department_id: str | None = None):
    conditions = [
        Ride.company_id == user.company_id,
        Ride.created_at >= day_start(from_date),
        Ride.created_at <= day_end(to_date),
        Ride.status == "COMPLETED",
    ]
    if user.role != "COMPANY_ADMIN":
        conditions.append(Ride.user_id == user.id)
    if department_id:
        conditions.append(Ride.department_id == parse_uuid(department_id, "department_id"))
    return conditions


async def company_dashboard(db: AsyncSession, user: User, from_date: date | None, to_date: date | None) -> dict:
    start, end = _date_window(from_date, to_date)
    conditions = _scope_conditions(user, start, end)

    totals = await db.execute(
        select(
            func.count(Ride.id),
            func.coalesce(func.sum(Ride.distance_km), 0),
            func.coalesce(func.sum(Ride.actual_co2_kg), 0),
            func.coalesce(func.sum(Ride.baseline_co2_kg), 0),
            func.coalesce(func.sum(Ride.co2_saved_kg), 0),
            func.coalesce(func.sum(Ride.fuel_saved_liters), 0),
            func.coalesce(func.sum(Ride.tree_equivalent), 0),
            func.coalesce(func.sum(Ride.green_points_added), 0),
        ).where(and_(*conditions))
    )
    row = totals.one()

    ev_count = await db.execute(select(Ride.vehicle_profile_id).where(and_(*conditions)))
    vehicle_ids = [r[0] for r in ev_count.all()]
    ev_rides = sum(1 for pid in vehicle_ids if VEHICLE_PROFILES.get(pid, {}).get("powertrain") == "ELECTRIC")
    ride_count = int(row[0])

    return {
        "period": {"from": start.isoformat(), "to": end.isoformat()},
        "summary": {
            "rideCount": ride_count,
            "distanceKm": float(row[1]),
            "actualCo2Kg": float(row[2]),
            "baselineCo2Kg": float(row[3]),
            "co2SavedKg": float(row[4]),
            "fuelSavedLiters": float(row[5]),
            "treeEquivalent": float(row[6]),
            "greenPointsIssued": int(row[7]),
            "evRideRate": round(ev_rides / ride_count, 4) if ride_count else 0,
        },
    }


async def leaderboard(db: AsyncSession, user: User, limit: int = 10) -> dict:
    result = await db.execute(
        select(User)
        .where(User.company_id == user.company_id, User.status == "ACTIVE")
        .order_by(desc(User.green_score), desc(User.green_points))
        .limit(limit)
    )
    users = result.scalars().all()
    return {
        "items": [
            {
                "rank": index + 1,
                "userId": str(item.id),
                "name": item.name,
                "departmentId": str(item.department_id) if item.department_id else None,
                "greenScore": item.green_score,
                "greenPoints": item.green_points,
            }
            for index, item in enumerate(users)
        ]
    }


async def trends(db: AsyncSession, user: User, from_date: date | None, to_date: date | None) -> dict:
    start, end = _date_window(from_date, to_date)
    conditions = _scope_conditions(user, start, end)
    day_bucket = func.date_trunc("day", Ride.created_at)
    result = await db.execute(
        select(
            day_bucket.label("day"),
            func.coalesce(func.sum(Ride.actual_co2_kg), 0),
            func.coalesce(func.sum(Ride.co2_saved_kg), 0),
            func.count(Ride.id),
        )
        .where(and_(*conditions))
        .group_by(day_bucket)
        .order_by(day_bucket)
    )

    return {
        "period": {"from": start.isoformat(), "to": end.isoformat()},
        "items": [
            {
                "date": str(row[0])[:10],
                "actualCo2Kg": float(row[1]),
                "co2SavedKg": float(row[2]),
                "rideCount": int(row[3]),
            }
            for row in result.all()
        ],
    }


async def predict_end_of_month(db: AsyncSession, user: User) -> dict:
    today = date.today()
    start = today.replace(day=1)
    end = today
    days_elapsed = max(1, (end - start).days + 1)
    days_in_month = monthrange(today.year, today.month)[1]

    dashboard = await company_dashboard(db, user, start, end)
    current = dashboard["summary"]
    scale = days_in_month / days_elapsed
    predicted_emission = round(current["actualCo2Kg"] * scale, 3)
    predicted_saved = round(current["co2SavedKg"] * scale, 3)

    log = PredictionLog(
        company_id=user.company_id,
        user_id=user.id if user.role != "COMPANY_ADMIN" else None,
        department_id=user.department_id if user.role != "COMPANY_ADMIN" else None,
        scope="COMPANY" if user.role == "COMPANY_ADMIN" else "EMPLOYEE",
        period_from=start,
        period_to=end,
        predicted_period_from=start,
        predicted_period_to=today.replace(day=days_in_month),
        current_emission_kg=current["actualCo2Kg"],
        predicted_emission_kg=predicted_emission,
        current_saved_kg=current["co2SavedKg"],
        predicted_saved_kg=predicted_saved,
        predicted_ev_rate=current["evRideRate"],
        confidence=0.72 if current["rideCount"] >= 5 else 0.45,
        model_id="statistical-monthly-v1",
        model_type="linear_projection",
    )
    db.add(log)

    return {
        "period": {"from": start.isoformat(), "to": end.isoformat()},
        "current": current,
        "prediction": {
            "monthEndEmissionKg": predicted_emission,
            "monthEndSavedKg": predicted_saved,
            "predictedEvRate": current["evRideRate"],
        },
        "model": {"id": log.model_id, "type": log.model_type, "confidence": float(log.confidence)},
    }


async def recommendations(db: AsyncSession, user: User, from_date: date | None, to_date: date | None) -> dict:
    start, end = _date_window(from_date, to_date)
    dashboard = await company_dashboard(db, user, start, end)
    summary = dashboard["summary"]
    items = []
    if summary["evRideRate"] < 0.6:
        items.append({
            "title": "Prioritize EV booking for commute trips",
            "reason": "EV adoption is below the recommended commuting target.",
            "estimatedCo2ReductionKg": round(summary["baselineCo2Kg"] * 0.15, 3),
        })
    if summary["rideCount"] > 0 and summary["distanceKm"] / summary["rideCount"] > 12:
        items.append({
            "title": "Group nearby employees into shared commute routes",
            "reason": "Average trip distance is high, so route grouping can reduce repeated journeys.",
            "estimatedCo2ReductionKg": round(summary["actualCo2Kg"] * 0.1, 3),
        })
    if not items:
        items.append({
            "title": "Maintain current green commuting behavior",
            "reason": "The current period already shows strong electric ride adoption.",
            "estimatedCo2ReductionKg": round(summary["actualCo2Kg"] * 0.03, 3),
        })

    output = {
        "scope": "company" if user.role == "COMPANY_ADMIN" else "employee",
        "summary": "Recommendations are generated from completed ride, EV rate, and carbon saving patterns.",
        "recommendations": items,
        "nextBestAction": items[0]["title"],
        "model": {"provider": "MOCK", "name": "rules-v1"},
    }
    db.add(RecommendationLog(
        company_id=user.company_id,
        user_id=user.id if user.role != "COMPANY_ADMIN" else None,
        department_id=user.department_id if user.role != "COMPANY_ADMIN" else None,
        scope="COMPANY" if user.role == "COMPANY_ADMIN" else "EMPLOYEE",
        period_from=start,
        period_to=end,
        input_summary=summary,
        output_json=output,
        provider="MOCK",
        model="rules-v1",
    ))
    return output


async def esg_report(db: AsyncSession, user: User, from_date: date | None, to_date: date | None) -> dict:
    if user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "FORBIDDEN", "message": "Admin access required"})
    dashboard = await company_dashboard(db, user, from_date, to_date)
    return {
        "standard": "Scope 3 - Category 7 Employee Commuting",
        "companyId": str(user.company_id),
        "period": dashboard["period"],
        "metrics": dashboard["summary"],
        "export": {
            "format": "json",
            "generatedBy": "Green Mobility API",
        },
    }
