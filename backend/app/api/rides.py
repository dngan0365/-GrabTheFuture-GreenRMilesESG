from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.ride import BookRideRequest, CompleteRideRequest
from app.services import ride_service

router = APIRouter(prefix="/rides", tags=["rides"])


@router.post("")
async def book_ride(
    payload: BookRideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ride_service.book_ride(db, current_user, payload)


@router.get("")
async def list_rides(
    from_date: date | None = None,
    to_date: date | None = None,
    vehicleProfileId: str | None = None,
    purpose: str | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ride_service.list_rides(db, current_user, from_date, to_date, vehicleProfileId, purpose, status)


@router.get("/{ride_id}")
async def get_ride(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ride_service.get_ride(db, current_user, ride_id)


@router.post("/{ride_id}/complete")
async def complete_ride(
    ride_id: str,
    payload: CompleteRideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ride_service.complete_ride(db, current_user, ride_id, payload)

