from pydantic import BaseModel


class RewardCatalogItem(BaseModel):
    id: str
    name: str
    description: str | None = None
    requiredGreenPoints: int
    valueVnd: int
    status: str
    redeemable: bool


class RedeemRewardRequest(BaseModel):
    rewardId: str


class RedeemRewardOut(BaseModel):
    redemptionId: str
    rewardId: str
    greenPointsSpent: int
    remainingGreenPoints: int
    voucherCode: str | None = None
