from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.reward import RedeemRewardRequest
from app.services import reward_service

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("")
async def list_rewards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reward_service.list_rewards(db, current_user)


@router.post("/redeem")
async def redeem_reward(
    payload: RedeemRewardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reward_service.redeem_reward(db, current_user, payload.rewardId)
