from pydantic import BaseModel
from typing import Optional


class RecommendationRequest(BaseModel):
    scope: str = "employee"   # employee | company | department
    from_date: str
    to_date: str
    language: str = "en"      # en | vi


class PredictionMonthlyRequest(BaseModel):
    companyId: str
    from_date: str
    to_date: str


class RecommendationItem(BaseModel):
    title: str
    reason: str
    estimatedCo2ReductionKg: float


class RecommendationOut(BaseModel):
    scope: str
    summary: str
    recommendations: list[RecommendationItem]
    nextBestAction: str
    model: dict


class PredictionOut(BaseModel):
    companyId: str
    period: dict
    current: dict
    prediction: dict
    status: dict
    model: dict


class EmployeePredictionOut(BaseModel):
    userId: str
    basisPeriod: dict
    nextWeek: dict
    currentWeek: dict
    prediction: dict
    model: dict