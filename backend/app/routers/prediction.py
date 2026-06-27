"""
ML Prediction routes (BackendSpec.md Section 11).

  POST /prediction/monthly   -> company month-end projection (11.1)
  GET  /prediction/employee  -> employee next-week projection (11.2)

Both use the ridge linear-regression model in app/services/prediction.py.

NOTE ON DATA SOURCE:
The regression model is DB-agnostic — it consumes a daily DailyPoint series.
Until the DB layer exists, the series is produced by the TEMPORARY demo sampler
(app/services/demo_data.py). Every demo call is fenced by a clearly marked
TODO(REMOVE) block showing the real `rides` query that should replace it.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field

from app.services import demo_data  # TODO(REMOVE): demo-only data source
from app.services.prediction import project_next_week, project_to_month_end

router = APIRouter(tags=["prediction"])


class MonthlyPredictionRequest(BaseModel):
    company_id: Optional[str] = Field(default=None, alias="companyId")
    period_from: date = Field(alias="from")
    period_to: date = Field(alias="to")

    model_config = ConfigDict(populate_by_name=True)


@router.post("/prediction/monthly")
def predict_company_monthly(req: MonthlyPredictionRequest):
    """11.1 — project a company's month-end emissions via linear regression."""
    today = date.today()
    observed_to = min(today, req.period_to)
    company_id = req.company_id or "cmp_demo"

    # ===================================================================
    # TODO(REMOVE FOR PRODUCTION): demo data sampled INSIDE the route.
    # Replace with a real aggregation over `rides` for this company:
    #   SELECT date(created_at) AS day,
    #          SUM(actual_co2_kg) AS emission_kg,
    #          SUM(co2_saved_kg)  AS saved_kg
    #   FROM rides
    #   WHERE company_id = :company_id AND status = 'COMPLETED'
    #     AND created_at BETWEEN :period_from AND :observed_to
    #   GROUP BY day ORDER BY day;
    # ...then map rows -> List[DailyPoint], and read target_monthly_emission_kg
    # from the companies table instead of the demo constant below.
    agg = demo_data.sample_company_series(company_id, req.period_from, observed_to)
    target_emission_kg = demo_data.DEMO_COMPANY_TARGET_MONTHLY_KG
    # ===================================================================

    result = project_to_month_end(
        agg.points, req.period_from, req.period_to, today=today
    )

    total_days = (req.period_to - req.period_from).days + 1
    days_elapsed = (observed_to - req.period_from).days + 1
    gap_kg = round(result.predicted_emission_kg - target_emission_kg, 3)
    risk_level = "AT_RISK" if result.predicted_emission_kg > target_emission_kg else "ON_TRACK"

    return {
        "data": {
            "companyId": company_id,
            "period": {
                "from": req.period_from.isoformat(),
                "to": req.period_to.isoformat(),
                "daysElapsed": days_elapsed,
                "totalDays": total_days,
            },
            "current": {
                "actualEmissionKg": agg.actual_emission_kg,
                "savedEmissionKg": agg.saved_emission_kg,
                "evRate": agg.ev_rate_pct,
                "totalTrips": agg.total_trips,
            },
            "prediction": {
                "predictedEmissionKg": result.predicted_emission_kg,
                "predictedSavedKg": result.predicted_saved_kg,
                "predictedEvRate": agg.ev_rate_pct,
                "confidence": result.confidence,
            },
            "status": {
                "targetEmissionKg": target_emission_kg,
                "riskLevel": risk_level,
                "gapKg": gap_kg,
            },
            "model": {
                "modelId": result.model_id,
                "modelType": result.model_type,
            },
        }
    }


@router.get("/prediction/employee")
def predict_employee_next_week(
    period_from: date = Query(alias="from"),
    period_to: date = Query(alias="to"),
    user_id: Optional[str] = Query(default=None, alias="userId"),
):
    """11.2 — project an employee's next-week emissions via linear regression."""
    uid = user_id or "usr_demo"

    # ===================================================================
    # TODO(REMOVE FOR PRODUCTION): demo data sampled INSIDE the route.
    # Replace with a real per-user daily aggregation over `rides`:
    #   SELECT date(created_at) AS day,
    #          SUM(actual_co2_kg) AS emission_kg,
    #          SUM(co2_saved_kg)  AS saved_kg
    #   FROM rides
    #   WHERE user_id = :user_id AND status = 'COMPLETED'
    #     AND created_at BETWEEN :period_from AND :period_to
    #   GROUP BY day ORDER BY day;
    # ...then map rows -> List[DailyPoint].
    agg = demo_data.sample_employee_series(uid, period_from, period_to)
    # ===================================================================

    next_week_start = period_to + timedelta(days=1)
    next_week_end = period_to + timedelta(days=7)
    result = project_next_week(agg.points, next_week_start)

    return {
        "data": {
            "userId": uid,
            "basisPeriod": {
                "from": period_from.isoformat(),
                "to": period_to.isoformat(),
            },
            "nextWeek": {
                "from": next_week_start.isoformat(),
                "to": next_week_end.isoformat(),
            },
            "currentWeek": {
                "totalTrips": agg.total_trips,
                "evTrips": agg.ev_trips,
                "petrolTrips": agg.petrol_trips,
                "actualEmissionKg": agg.actual_emission_kg,
                "savedEmissionKg": agg.saved_emission_kg,
                "evRate": agg.ev_rate_pct,
            },
            "prediction": {
                "predictedTrips": agg.total_trips,
                "predictedEmissionKg": result.predicted_emission_kg,
                "predictedSavedKg": result.predicted_saved_kg,
                "predictedEvRate": agg.ev_rate_pct,
                "confidence": result.confidence,
            },
            "model": {
                "modelId": result.model_id,
                "modelType": result.model_type,
            },
        }
    }
