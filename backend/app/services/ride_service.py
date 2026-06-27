from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
from app.core.utils import day_end, day_start, parse_uuid
from app.models.user import User
from app.models.ride import Ride
from app.core.carbon import VEHICLE_PROFILES, calculate_carbon, calculate_reward
from app.schemas.ride import BookRideRequest, CompleteRideRequest
from app.services.distance_service import get_route_distance


def _format_ride(ride: Ride) -> dict:
    profile = VEHICLE_PROFILES.get(ride.vehicle_profile_id, {})
    return {
        "id": str(ride.id),
        "userId": str(ride.user_id),
        "status": ride.status,
        "originName": ride.origin_name,
        "destinationName": ride.destination_name,
        "distanceKm": float(ride.distance_km),
        "vehicleProfileId": ride.vehicle_profile_id,
        "vehicleDisplayName": profile.get("displayName", ride.vehicle_profile_id),
        "purpose": ride.purpose,
        "estimatedDurationMinutes": ride.estimated_duration_minutes,
        "actualDurationMinutes": ride.actual_duration_minutes,
        "priceVnd": ride.price_vnd,
        "actualPriceVnd": ride.actual_price_vnd,
        "createdAt": str(ride.created_at),
        "completedAt": str(ride.completed_at) if ride.completed_at else None,
    }


def _format_carbon(ride: Ride) -> dict:
    return {
        "baselineProfileId": ride.baseline_profile_id,
        "baselineCo2Kg": float(ride.baseline_co2_kg),
        "actualCo2Kg": float(ride.actual_co2_kg),
        "co2SavedKg": float(ride.co2_saved_kg),
        "fuelSavedLiters": float(ride.fuel_saved_liters),
        "treeEquivalent": float(ride.tree_equivalent),
    }


async def book_ride(db: AsyncSession, user: User, payload: BookRideRequest) -> dict:
    if payload.vehicleProfileId not in VEHICLE_PROFILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": f"Unknown vehicleProfileId: {payload.vehicleProfileId}"},
        )

    distance_km = payload.distanceKm
    estimated_duration = payload.estimatedDurationMinutes
    distance_provider = None
    if distance_km is None:
        route = await get_route_distance(payload.originName, payload.destinationName)
        distance_km = route.distance_km
        estimated_duration = estimated_duration or route.duration_minutes
        distance_provider = route.provider

    carbon = calculate_carbon(distance_km, payload.vehicleProfileId)

    ride = Ride(
        user_id=user.id,
        company_id=user.company_id,
        department_id=user.department_id,
        origin_name=payload.originName,
        destination_name=payload.destinationName,
        distance_km=distance_km,
        vehicle_profile_id=payload.vehicleProfileId,
        baseline_profile_id=carbon.baseline_profile_id,
        purpose=payload.purpose,
        status="BOOKED",
        estimated_duration_minutes=estimated_duration,
        price_vnd=payload.priceVnd,
        baseline_co2_kg=carbon.baseline_co2_kg,
        actual_co2_kg=carbon.actual_co2_kg,
        co2_saved_kg=carbon.co2_saved_kg,
        fuel_saved_liters=carbon.fuel_saved_liters,
        tree_equivalent=carbon.tree_equivalent,
    )
    db.add(ride)
    await db.flush()
    await db.refresh(ride)

    return {
        "ride": _format_ride(ride),
        "route": {
            "distanceKm": distance_km,
            "estimatedDurationMinutes": estimated_duration,
            "provider": distance_provider or "CLIENT_PROVIDED",
        },
        "carbonEstimate": {
            "baselineProfileId": carbon.baseline_profile_id,
            "baselineCo2Kg": carbon.baseline_co2_kg,
            "actualCo2Kg": carbon.actual_co2_kg,
            "co2SavedKg": carbon.co2_saved_kg,
            "fuelSavedLiters": carbon.fuel_saved_liters,
            "treeEquivalent": carbon.tree_equivalent,
        },
    }


async def get_ride(db: AsyncSession, user: User, ride_id: str) -> dict:
    result = await db.execute(select(Ride).where(Ride.id == parse_uuid(ride_id, "ride_id")))
    ride = result.scalar_one_or_none()

    if not ride:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Ride not found"})
    if str(ride.user_id) != str(user.id) and user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Access denied"})

    out = {"ride": _format_ride(ride), "carbon": _format_carbon(ride)}
    if ride.status == "COMPLETED":
        out["reward"] = {"greenScoreAdded": ride.green_score_added, "greenPointsAdded": ride.green_points_added}
    return out


async def list_rides(
    db: AsyncSession,
    user: User,
    from_date=None,
    to_date=None,
    vehicle_profile_id=None,
    purpose=None,
    ride_status=None,
) -> dict:
    conditions = [Ride.user_id == user.id]
    if from_date:
        conditions.append(Ride.created_at >= day_start(from_date))
    if to_date:
        conditions.append(Ride.created_at <= day_end(to_date))
    if vehicle_profile_id:
        conditions.append(Ride.vehicle_profile_id == vehicle_profile_id)
    if purpose:
        conditions.append(Ride.purpose == purpose)
    if ride_status:
        conditions.append(Ride.status == ride_status)

    result = await db.execute(select(Ride).where(and_(*conditions)).order_by(Ride.created_at.desc()))
    rides = result.scalars().all()

    items = []
    for r in rides:
        profile = VEHICLE_PROFILES.get(r.vehicle_profile_id, {})
        items.append({
            "id": str(r.id),
            "date": str(r.created_at)[:10],
            "originName": r.origin_name,
            "destinationName": r.destination_name,
            "distanceKm": float(r.distance_km),
            "vehicleProfileId": r.vehicle_profile_id,
            "vehicleDisplayName": profile.get("displayName", r.vehicle_profile_id),
            "powertrain": profile.get("powertrain", ""),
            "purpose": r.purpose,
            "priceVnd": r.price_vnd,
            "actualCo2Kg": float(r.actual_co2_kg),
            "co2SavedKg": float(r.co2_saved_kg),
            "greenPointsAdded": r.green_points_added,
            "status": r.status,
        })

    return {"items": items, "total": len(items)}


async def complete_ride(db: AsyncSession, user: User, ride_id: str, payload: CompleteRideRequest) -> dict:
    result = await db.execute(select(Ride).where(Ride.id == parse_uuid(ride_id, "ride_id")))
    ride = result.scalar_one_or_none()

    if not ride:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Ride not found"})
    if str(ride.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Access denied"})
    if ride.status != "BOOKED":
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Ride is not in BOOKED status"})

    # Calculate final carbon (may differ from estimate if distance changed)
    carbon = calculate_carbon(float(ride.distance_km), ride.vehicle_profile_id)
    reward = calculate_reward(carbon.co2_saved_kg)

    ride.status = "COMPLETED"
    ride.actual_duration_minutes = payload.actualDurationMinutes
    ride.actual_price_vnd = payload.actualPriceVnd
    ride.baseline_co2_kg = carbon.baseline_co2_kg
    ride.actual_co2_kg = carbon.actual_co2_kg
    ride.co2_saved_kg = carbon.co2_saved_kg
    ride.fuel_saved_liters = carbon.fuel_saved_liters
    ride.tree_equivalent = carbon.tree_equivalent
    ride.green_points_added = reward.green_points_added
    ride.green_score_added = reward.green_score_added
    ride.completed_at = datetime.now(timezone.utc)

    # Update user points
    user_result = await db.execute(select(User).where(User.id == user.id))
    db_user = user_result.scalar_one()
    db_user.green_points += reward.green_points_added
    db_user.green_score += reward.green_score_added

    await db.flush()

    return {
        "ride": {
            "id": str(ride.id),
            "status": ride.status,
            "actualDurationMinutes": ride.actual_duration_minutes,
            "actualPriceVnd": ride.actual_price_vnd,
            "completedAt": ride.completed_at,
        },
        "carbon": _format_carbon(ride),
        "reward": {"greenScoreAdded": reward.green_score_added, "greenPointsAdded": reward.green_points_added},
    }
