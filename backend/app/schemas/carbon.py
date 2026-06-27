from pydantic import BaseModel, field_validator
from typing import Optional


class CarbonCalculateRequest(BaseModel):
    distanceKm: float
    vehicleProfileId: str

    @field_validator("distanceKm")
    @classmethod
    def distance_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("distanceKm must be greater than 0")
        return v

    @field_validator("vehicleProfileId")
    @classmethod
    def valid_profile(cls, v: str) -> str:
        from app.core.carbon import VEHICLE_PROFILES
        if v not in VEHICLE_PROFILES:
            raise ValueError(f"Unknown vehicleProfileId: {v}")
        return v


class CarbonCompareRequest(BaseModel):
    distanceKm: float
    vehicleClass: str

    @field_validator("vehicleClass")
    @classmethod
    def valid_class(cls, v: str) -> str:
        if v not in ("MOTORBIKE", "CAR_4", "SUV_7"):
            raise ValueError("vehicleClass must be MOTORBIKE, CAR_4, or SUV_7")
        return v


class VehicleInfo(BaseModel):
    vehicleProfileId: str
    displayName: str
    vehicleClass: str
    powertrain: str
    co2KgPerKm: float


class CarbonResultOut(BaseModel):
    baselineCo2Kg: float
    actualCo2Kg: float
    co2SavedKg: float
    fuelSavedLiters: float
    treeEquivalent: float


class CompareOptionOut(BaseModel):
    vehicleProfileId: str
    displayName: str
    actualCo2Kg: float
    baselineCo2Kg: float
    co2SavedKg: float
    fuelSavedLiters: float
    treeEquivalent: float
    recommended: bool


class RouteDistanceRequest(BaseModel):
    originName: str
    destinationName: str
    vehicle: str = "car"


class RouteDistanceOut(BaseModel):
    originName: str
    destinationName: str
    distanceKm: float
    durationMinutes: int | None = None
    provider: str
