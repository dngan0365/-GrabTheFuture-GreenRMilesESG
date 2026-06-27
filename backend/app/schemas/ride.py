from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date


class BookRideRequest(BaseModel):
    originName: str
    destinationName: str
    distanceKm: Optional[float] = None
    vehicleProfileId: str
    purpose: str
    estimatedDurationMinutes: Optional[int] = None
    priceVnd: int = 0

    @field_validator("distanceKm")
    @classmethod
    def distance_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("distanceKm must be greater than 0")
        return v

    @field_validator("purpose")
    @classmethod
    def valid_purpose(cls, v: str) -> str:
        if v not in ("COMMUTE", "BUSINESS", "OTHER"):
            raise ValueError("purpose must be COMMUTE, BUSINESS, or OTHER")
        return v


class CompleteRideRequest(BaseModel):
    actualDurationMinutes: Optional[int] = None
    actualPriceVnd: Optional[int] = None


class CarbonEstimateOut(BaseModel):
    baselineProfileId: str
    baselineCo2Kg: float
    actualCo2Kg: float
    co2SavedKg: float
    fuelSavedLiters: float
    treeEquivalent: float


class RewardOut(BaseModel):
    greenScoreAdded: int
    greenPointsAdded: int


class RideOut(BaseModel):
    id: str
    userId: str
    status: str
    originName: str
    destinationName: str
    distanceKm: float
    vehicleProfileId: str
    vehicleDisplayName: str
    purpose: str
    estimatedDurationMinutes: Optional[int]
    actualDurationMinutes: Optional[int] = None
    priceVnd: int
    actualPriceVnd: Optional[int] = None
    createdAt: str
    completedAt: Optional[str] = None


class RideHistoryItem(BaseModel):
    id: str
    date: str
    originName: str
    destinationName: str
    distanceKm: float
    vehicleProfileId: str
    vehicleDisplayName: str
    powertrain: str
    purpose: str
    priceVnd: int
    actualCo2Kg: float
    co2SavedKg: float
    greenPointsAdded: int
    status: str


class RideHistoryQuery(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    vehicleProfileId: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[str] = None
