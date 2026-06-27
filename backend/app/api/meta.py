from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reward import Reward
from app.models.user import Company, User
from app.models.vehicle import VehicleProfile

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("")
async def get_meta(db: AsyncSession = Depends(get_db)):
    companies_result = await db.execute(select(Company).order_by(Company.name))
    users_result = await db.execute(
        select(User).where(User.role == "EMPLOYEE", User.status == "ACTIVE").order_by(User.name)
    )
    vehicles_result = await db.execute(select(VehicleProfile).order_by(VehicleProfile.vehicle_class, VehicleProfile.powertrain))
    rewards_result = await db.execute(select(Reward).where(Reward.status == "ACTIVE").order_by(Reward.required_green_points))

    return {
        "companies": [{"id": str(item.id), "name": item.name} for item in companies_result.scalars().all()],
        "users": [
            {
                "id": str(item.id),
                "name": item.name,
                "email": item.email,
                "company_id": str(item.company_id),
                "department_id": str(item.department_id) if item.department_id else None,
                "green_points": item.green_points,
                "green_score": item.green_score,
            }
            for item in users_result.scalars().all()
        ],
        "vehicle_profiles": [
            {
                "id": item.id,
                "display_name": item.display_name,
                "vehicle_class": item.vehicle_class,
                "powertrain": item.powertrain,
                "co2_kg_per_km": float(item.co2_kg_per_km),
                "baseline_profile_id": item.baseline_profile_id,
            }
            for item in vehicles_result.scalars().all()
        ],
        "rewards": [
            {
                "id": str(item.id),
                "name": item.name,
                "description": item.description,
                "required_green_points": item.required_green_points,
                "value_vnd": item.value_vnd,
            }
            for item in rewards_result.scalars().all()
        ],
    }
