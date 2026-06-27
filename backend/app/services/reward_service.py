import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import parse_uuid
from app.models.reward import Reward, RewardRedemption
from app.models.user import User


async def list_rewards(db: AsyncSession, user: User) -> dict:
    result = await db.execute(select(Reward).where(Reward.status == "ACTIVE").order_by(Reward.required_green_points))
    rewards = result.scalars().all()
    return {
        "items": [
            {
                "id": str(reward.id),
                "name": reward.name,
                "description": reward.description,
                "requiredGreenPoints": reward.required_green_points,
                "valueVnd": reward.value_vnd,
                "status": reward.status,
                "redeemable": user.green_points >= reward.required_green_points,
            }
            for reward in rewards
        ],
        "balance": {"greenPoints": user.green_points, "greenScore": user.green_score},
    }


async def redeem_reward(db: AsyncSession, user: User, reward_id: str) -> dict:
    result = await db.execute(select(Reward).where(Reward.id == parse_uuid(reward_id, "rewardId"), Reward.status == "ACTIVE"))
    reward = result.scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Reward not found"})
    if user.green_points < reward.required_green_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INSUFFICIENT_POINTS", "message": "Not enough green points to redeem this reward."},
        )

    user.green_points -= reward.required_green_points
    redemption = RewardRedemption(
        user_id=user.id,
        reward_id=reward.id,
        green_points_spent=reward.required_green_points,
        voucher_code=f"GREEN-{uuid.uuid4().hex[:8].upper()}" if reward.value_vnd else None,
    )
    db.add(redemption)
    await db.flush()

    return {
        "redemptionId": str(redemption.id),
        "rewardId": str(reward.id),
        "greenPointsSpent": redemption.green_points_spent,
        "remainingGreenPoints": user.green_points,
        "voucherCode": redemption.voucher_code,
    }
