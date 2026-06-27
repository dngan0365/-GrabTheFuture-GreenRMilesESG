"""
AI Recommendation route (BackendSpec.md Section 12).

  POST /recommendation  -> generate green-mobility recommendations.

Uses the dynamic MOCK generator in app/services/recommendation.py. The
provider can later be switched to OpenAI/Claude (see that module's
FUTURE DIRECTION notes) without changing this route's contract.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.services import demo_data  # TODO(REMOVE): demo-only data source
from app.services.recommendation import Provider, Scope, generate

router = APIRouter(tags=["recommendation"])


class RecommendationRequest(BaseModel):
    scope: str = "employee"
    period_from: date = Field(alias="from")
    period_to: date = Field(alias="to")
    language: str = "en"
    # Optional subject id (defaults applied per scope in the handler).
    subject_id: Optional[str] = Field(default=None, alias="subjectId")

    model_config = ConfigDict(populate_by_name=True)


def _parse_scope(raw: str) -> Scope:
    try:
        return Scope(raw.lower())
    except ValueError:
        return Scope.EMPLOYEE


@router.post("/recommendation")
def generate_recommendation(req: RecommendationRequest):
    """12.1 — generate recommendations from aggregated mobility data."""
    scope = _parse_scope(req.scope)
    subject_id = req.subject_id or ("usr_demo" if scope == Scope.EMPLOYEE else "cmp_demo")

    # ===================================================================
    # TODO(REMOVE FOR PRODUCTION): demo data sampled INSIDE the route.
    # Two replacements needed here:
    #  1. CACHE LOOKUP — before generating, check recommendation_logs for an
    #     existing row matching (scope, subject, period) and return its
    #     output_json if present (see DatabaseSpec.md 2.10).
    #  2. SUMMARY BUILD — on cache miss, aggregate `rides` into a
    #     MobilitySummary (DatabaseSpec.md Section 5), then call generate(),
    #     then persist input_summary + output_json into recommendation_logs.
    summary = demo_data.sample_mobility_summary(
        scope, subject_id, req.period_from, req.period_to
    )
    # ===================================================================

    # provider=MOCK for the hackathon; swap to Provider.OPENAI / CLAUDE later.
    result = generate(summary, scope=scope, language=req.language, provider=Provider.MOCK)

    return {"data": result.to_output_json(scope=scope)}
