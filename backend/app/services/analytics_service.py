from calendar import monthrange
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.carbon import VEHICLE_PROFILES
from app.core.utils import day_end, day_start, parse_uuid
from app.models.reward import PredictionLog, RecommendationLog
from app.models.ride import Ride
from app.models.user import Department, User
from app.services.prediction import DailyPoint, fit_and_project, project_to_month_end
from app.services.recommendation import (
    MobilitySummary,
    Provider,
    Scope,
    generate as generate_recommendation,
)

# Postgres date_part('dow', ...): 0 = Sunday .. 6 = Saturday.
_WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


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

    # Pull raw rows and aggregate per day in Python so we can also derive EV
    # counts (powertrain lives in the carbon profile map, not the DB).
    rows = await db.execute(
        select(
            Ride.created_at,
            Ride.vehicle_profile_id,
            Ride.actual_co2_kg,
            Ride.co2_saved_kg,
        ).where(and_(*conditions))
    )
    buckets: dict[date, dict] = {}
    for created_at, vpid, actual, saved in rows.all():
        day = created_at.date()
        b = buckets.setdefault(day, {"actual": 0.0, "saved": 0.0, "count": 0, "ev": 0})
        b["actual"] += float(actual or 0)
        b["saved"] += float(saved or 0)
        b["count"] += 1
        if VEHICLE_PROFILES.get(vpid, {}).get("powertrain") == "ELECTRIC":
            b["ev"] += 1

    items = []
    for day in sorted(buckets):
        b = buckets[day]
        items.append({
            "date": day.isoformat(),
            "actualCo2Kg": round(b["actual"], 3),
            "co2SavedKg": round(b["saved"], 3),
            "rideCount": b["count"],
            "evTrips": b["ev"],
            "evRate": round(b["ev"] / b["count"], 4) if b["count"] else 0,
        })

    # Regression forecast of daily CO2 saved for the next 14 days (dashed line).
    forecast = []
    if items:
        saved_series = [
            DailyPoint(day=date.fromisoformat(it["date"]), emission_kg=it["co2SavedKg"])
            for it in items
        ]
        horizon_start = saved_series[-1].day + timedelta(days=1)
        projection = fit_and_project(
            saved_series, horizon_days=14, horizon_start=horizon_start,
            model_id="trend_forecast_v1",
        )
        for i, value in enumerate(projection.daily_forecast_kg):
            forecast.append({
                "date": (horizon_start + timedelta(days=i)).isoformat(),
                "savedCo2Kg": round(value, 3),
            })

    return {
        "period": {"from": start.isoformat(), "to": end.isoformat()},
        "items": items,
        "forecast": forecast,
    }


async def emission_by_department(
    db: AsyncSession, user: User, from_date: date | None, to_date: date | None
) -> dict:
    start, end = _date_window(from_date, to_date)
    conditions = _scope_conditions(user, start, end)

    names_result = await db.execute(
        select(Department.id, Department.name).where(Department.company_id == user.company_id)
    )
    names = {row[0]: row[1] for row in names_result.all()}

    rows = await db.execute(
        select(
            Ride.department_id,
            Ride.vehicle_profile_id,
            Ride.distance_km,
            Ride.actual_co2_kg,
            Ride.baseline_co2_kg,
            Ride.co2_saved_kg,
        ).where(and_(*conditions))
    )
    buckets: dict = {}
    for dept_id, vpid, dist, actual, baseline, saved in rows.all():
        b = buckets.setdefault(
            dept_id,
            {"trips": 0, "ev": 0, "dist": 0.0, "actual": 0.0, "baseline": 0.0, "saved": 0.0},
        )
        b["trips"] += 1
        b["dist"] += float(dist or 0)
        b["actual"] += float(actual or 0)
        b["baseline"] += float(baseline or 0)
        b["saved"] += float(saved or 0)
        if VEHICLE_PROFILES.get(vpid, {}).get("powertrain") == "ELECTRIC":
            b["ev"] += 1

    items = [
        {
            "label": names.get(dept_id, "Unassigned"),
            "totalTrips": b["trips"],
            "evTrips": b["ev"],
            "petrolTrips": b["trips"] - b["ev"],
            "totalDistanceKm": round(b["dist"], 3),
            "actualCo2Kg": round(b["actual"], 3),
            "baselineCo2Kg": round(b["baseline"], 3),
            "savedCo2Kg": round(b["saved"], 3),
            "evRate": round(b["ev"] / b["trips"], 4) if b["trips"] else 0,
        }
        for dept_id, b in buckets.items()
    ]
    items.sort(key=lambda it: it["savedCo2Kg"], reverse=True)
    return {"groupBy": "department", "items": items}


async def _daily_series(db: AsyncSession, user: User, start: date, end: date) -> list[DailyPoint]:
    """Per-day (emission, saved) series from completed rides — feeds the model."""
    conditions = _scope_conditions(user, start, end)
    day_bucket = func.date_trunc("day", Ride.created_at)
    result = await db.execute(
        select(
            day_bucket.label("day"),
            func.coalesce(func.sum(Ride.actual_co2_kg), 0),
            func.coalesce(func.sum(Ride.co2_saved_kg), 0),
        )
        .where(and_(*conditions))
        .group_by(day_bucket)
        .order_by(day_bucket)
    )
    series: list[DailyPoint] = []
    for row in result.all():
        raw = row[0]
        day = raw.date() if hasattr(raw, "date") else raw
        series.append(DailyPoint(day=day, emission_kg=float(row[1]), saved_kg=float(row[2])))
    return series


async def predict_end_of_month(db: AsyncSession, user: User) -> dict:
    today = date.today()
    start = today.replace(day=1)
    days_in_month = monthrange(today.year, today.month)[1]
    end_of_month = today.replace(day=days_in_month)

    dashboard = await company_dashboard(db, user, start, today)
    current = dashboard["summary"]

    # Regression on the month-to-date daily emission series, projected to the
    # end of the month (observed days + forecast of the remaining days).
    series = await _daily_series(db, user, start, today)
    projection = project_to_month_end(series, start, end_of_month, today=today)

    predicted_emission = projection.predicted_emission_kg
    predicted_saved = projection.predicted_saved_kg
    confidence = projection.confidence

    log = PredictionLog(
        company_id=user.company_id,
        user_id=user.id if user.role != "COMPANY_ADMIN" else None,
        department_id=user.department_id if user.role != "COMPANY_ADMIN" else None,
        scope="COMPANY" if user.role == "COMPANY_ADMIN" else "EMPLOYEE",
        period_from=start,
        period_to=today,
        predicted_period_from=start,
        predicted_period_to=end_of_month,
        current_emission_kg=current["actualCo2Kg"],
        predicted_emission_kg=predicted_emission,
        current_saved_kg=current["co2SavedKg"],
        predicted_saved_kg=predicted_saved,
        predicted_ev_rate=current["evRideRate"],
        confidence=confidence,
        model_id=projection.model_id,
        model_type=projection.model_type,
    )
    db.add(log)

    return {
        "period": {"from": start.isoformat(), "to": today.isoformat()},
        "current": current,
        "prediction": {
            "monthEndEmissionKg": predicted_emission,
            "monthEndSavedKg": predicted_saved,
            "predictedEvRate": current["evRideRate"],
        },
        "model": {"id": projection.model_id, "type": projection.model_type, "confidence": float(confidence)},
    }


async def _top_emission_weekday(db: AsyncSession, conditions) -> str | None:
    dow = func.date_part("dow", Ride.created_at)
    result = await db.execute(
        select(dow, func.coalesce(func.sum(Ride.actual_co2_kg), 0))
        .where(and_(*conditions))
        .group_by(dow)
        .order_by(desc(func.coalesce(func.sum(Ride.actual_co2_kg), 0)))
        .limit(1)
    )
    row = result.first()
    return _WEEKDAY_NAMES[int(row[0])] if row and row[0] is not None else None


async def _top_emission_vehicle(db: AsyncSession, conditions) -> str | None:
    result = await db.execute(
        select(Ride.vehicle_profile_id, func.coalesce(func.sum(Ride.actual_co2_kg), 0))
        .where(and_(*conditions))
        .group_by(Ride.vehicle_profile_id)
        .order_by(desc(func.coalesce(func.sum(Ride.actual_co2_kg), 0)))
        .limit(1)
    )
    row = result.first()
    return row[0] if row else None


async def recommendations(db: AsyncSession, user: User, from_date: date | None, to_date: date | None) -> dict:
    start, end = _date_window(from_date, to_date)
    dashboard = await company_dashboard(db, user, start, end)
    summary = dashboard["summary"]
    conditions = _scope_conditions(user, start, end)

    ride_count = summary["rideCount"]
    ev_trips = round(ride_count * summary["evRideRate"])
    petrol_trips = ride_count - ev_trips

    # Build a data-driven mobility summary from real DB aggregates.
    mobility = MobilitySummary(
        total_trips=ride_count,
        ev_trips=ev_trips,
        petrol_trips=petrol_trips,
        total_distance_km=summary["distanceKm"],
        actual_emission_kg=summary["actualCo2Kg"],
        baseline_emission_kg=summary["baselineCo2Kg"],
        saved_emission_kg=summary["co2SavedKg"],
        fuel_saved_liters=summary["fuelSavedLiters"],
        green_points=summary["greenPointsIssued"],
        highest_emission_day=await _top_emission_weekday(db, conditions),
        highest_emission_vehicle=await _top_emission_vehicle(db, conditions),
        user_id=str(user.id) if user.role != "COMPANY_ADMIN" else None,
        department=None,
    )

    scope = Scope.COMPANY if user.role == "COMPANY_ADMIN" else Scope.EMPLOYEE
    result = generate_recommendation(
        mobility, scope=scope, language="en", provider=Provider.MOCK
    )
    output = result.to_output_json(scope=scope)

    db.add(RecommendationLog(
        company_id=user.company_id,
        user_id=user.id if user.role != "COMPANY_ADMIN" else None,
        department_id=user.department_id if user.role != "COMPANY_ADMIN" else None,
        scope="COMPANY" if user.role == "COMPANY_ADMIN" else "EMPLOYEE",
        period_from=start,
        period_to=end,
        input_summary=summary,
        output_json=output,
        provider=result.provider.value,
        model=result.model,
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
