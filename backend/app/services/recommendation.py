"""
AI "Green" Recommendation Service — AI Model 2.

For the hackathon this generates recommendations with a **dynamic MOCK
generator**: it derives sensible, data-driven advice from the aggregated
mobility summary (no network, no API key, deterministic for the demo). The
seeded `recommendation_logs` rows in db/04-demo-data.sql already use
provider='MOCK', so this is the intended default path.

--------------------------------------------------------------------------
FUTURE DIRECTION — swapping in a real LLM provider
--------------------------------------------------------------------------
The provider dispatch below is structured so that turning on a real model is a
small, isolated change. To enable OpenAI or Claude:

  1. Add the SDK to requirements (`openai` or `anthropic`) and an API key to
     `.env` (OPENAI_API_KEY / ANTHROPIC_API_KEY).
  2. Fill in `_generate_openai` / `_generate_claude` (stubs below). Build the
     prompt from `summary.to_llm_input()` (already spec-shaped) and parse the
     JSON response into a `RecommendationResult`.
  3. Set provider=Provider.OPENAI (or CLAUDE) on the call. Everything else —
     the response contract, caching, and storage — stays identical; only the
     `provider`/`model` fields in the output change.

The intended endpoint flow (POST /recommendation), to be wired in the route
layer once the DB session exists:

    1. CACHE HIT  -> return existing recommendation_logs.output_json for the
                     same (scope, period, subject). No model call.
    2. CACHE MISS -> build MobilitySummary from rides, call generate(),
                     persist input_summary + output_json into
                     recommendation_logs, then return it.

`generate()` always falls back to MOCK if a real provider errors out, so a
flaky API key or quota never breaks the demo.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class Provider(str, Enum):
    MOCK = "MOCK"
    OPENAI = "OPENAI"
    CLAUDE = "CLAUDE"


class Scope(str, Enum):
    EMPLOYEE = "employee"
    DEPARTMENT = "department"
    COMPANY = "company"


# Representative petrol→EV CO2 delta per km (motorbike: 0.050 - 0.024).
# Used only by the MOCK generator to estimate "if you switched" reductions.
_EV_SWITCH_DELTA_KG_PER_KM = 0.026
_MOCK_MODEL_NAME = "mock-v1"


@dataclass
class MobilitySummary:
    """Aggregated mobility metrics for a subject over a period.

    The route layer builds this from `rides`; the generator only reads it, so
    the service stays DB-agnostic and unit-testable.
    """

    total_trips: int = 0
    ev_trips: int = 0
    petrol_trips: int = 0
    total_distance_km: float = 0.0
    actual_emission_kg: float = 0.0
    baseline_emission_kg: float = 0.0
    saved_emission_kg: float = 0.0
    fuel_saved_liters: float = 0.0
    green_points: int = 0
    # Optional behavioural patterns (used to enrich recommendations if present).
    highest_emission_vehicle: Optional[str] = None
    most_common_vehicle: Optional[str] = None
    highest_emission_day: Optional[str] = None
    # Optional subject identifiers (for prompt context / logging).
    user_id: Optional[str] = None
    department: Optional[str] = None

    @property
    def ev_rate_pct(self) -> float:
        if self.total_trips <= 0:
            return 0.0
        return round(self.ev_trips / self.total_trips * 100, 1)

    @property
    def avg_trip_distance_km(self) -> float:
        if self.total_trips <= 0:
            return 0.0
        return round(self.total_distance_km / self.total_trips, 2)

    def to_llm_input(self) -> Dict:
        """Spec-shaped payload a real LLM prompt would be built from."""
        return {
            "profile": {"userId": self.user_id, "department": self.department},
            "mobilitySummary": {
                "totalTrips": self.total_trips,
                "evTrips": self.ev_trips,
                "petrolTrips": self.petrol_trips,
                "evRate": self.ev_rate_pct,
                "totalDistanceKm": round(self.total_distance_km, 2),
                "actualEmissionKg": round(self.actual_emission_kg, 3),
                "baselineEmissionKg": round(self.baseline_emission_kg, 3),
                "savedEmissionKg": round(self.saved_emission_kg, 3),
                "fuelSavedLiters": round(self.fuel_saved_liters, 3),
                "greenPoints": self.green_points,
            },
            "patterns": {
                "highestEmissionVehicle": self.highest_emission_vehicle,
                "mostCommonVehicle": self.most_common_vehicle,
                "averageTripDistanceKm": self.avg_trip_distance_km,
                "highestEmissionDay": self.highest_emission_day,
            },
        }


@dataclass
class Recommendation:
    title: str
    reason: str
    estimated_co2_reduction_kg: float

    def to_json(self) -> Dict:
        return {
            "title": self.title,
            "reason": self.reason,
            "estimatedCo2ReductionKg": round(self.estimated_co2_reduction_kg, 3),
        }


@dataclass
class RecommendationResult:
    summary: str
    recommendations: List[Recommendation]
    next_best_action: str
    provider: Provider = Provider.MOCK
    model: str = _MOCK_MODEL_NAME

    def to_output_json(self, scope: Optional[Scope] = None) -> Dict:
        """Serialize to the exact shape the API spec (Section 12) returns."""
        data: Dict = {
            "summary": self.summary,
            "recommendations": [r.to_json() for r in self.recommendations],
            "nextBestAction": self.next_best_action,
            "model": {"provider": self.provider.value, "model": self.model},
        }
        if scope is not None:
            data["scope"] = scope.value
        return data


# ---------------------------------------------------------------------------
# Localised copy. Keyed by language ("en"/"vi"). Callables take the summary and
# computed numbers so the text stays data-driven.
# ---------------------------------------------------------------------------

def _txt(language: str, en: str, vi: str) -> str:
    return vi if language == "vi" else en


def _mock_summary(s: MobilitySummary, language: str) -> str:
    ev = s.ev_rate_pct
    if ev >= 80:
        return _txt(
            language,
            "You already use EV for most trips, but the remaining petrol trips "
            "still create most of your avoidable emissions.",
            "Bạn đã dùng xe điện cho phần lớn chuyến đi, nhưng các chuyến xe xăng "
            "còn lại vẫn tạo ra phần lớn lượng khí thải có thể tránh được.",
        )
    if ev >= 50:
        return _txt(
            language,
            "You use EV for over half of your trips. Shifting more petrol trips "
            "to EV is your fastest way to cut emissions further.",
            "Bạn dùng xe điện cho hơn một nửa số chuyến. Chuyển thêm chuyến xe xăng "
            "sang xe điện là cách nhanh nhất để giảm phát thải.",
        )
    return _txt(
        language,
        "Most of your trips still use petrol vehicles, which is the largest "
        "and most avoidable source of your mobility emissions.",
        "Phần lớn chuyến đi của bạn vẫn dùng xe xăng — đây là nguồn phát thải "
        "lớn nhất và dễ tránh nhất trong hoạt động di chuyển.",
    )


def _generate_mock(
    summary: MobilitySummary,
    scope: Scope,
    language: str,
) -> RecommendationResult:
    """Dynamic, data-driven mock recommendations.

    Heuristics (intentionally simple and explainable):
      * Switching petrol trips to EV: estimate = n_trips * avg_distance * Δkg/km.
      * Defaulting short trips to EV when EV adoption is not yet high.
      * Targeting the highest-emission day / vehicle when that pattern is known.
    """
    avg_dist = summary.avg_trip_distance_km or 8.0
    ev = summary.ev_rate_pct
    recs: List[Recommendation] = []

    # --- Rec 1: switch some petrol trips to EV (only if there are any). ---
    if summary.petrol_trips >= 1:
        n_switch = min(3, summary.petrol_trips)
        reduction = n_switch * avg_dist * _EV_SWITCH_DELTA_KG_PER_KM
        recs.append(
            Recommendation(
                title=_txt(
                    language,
                    f"Switch {n_switch} petrol trip(s) to EV next week",
                    f"Chuyển {n_switch} chuyến xe xăng sang xe điện tuần tới",
                ),
                reason=_txt(
                    language,
                    "This directly reduces the largest avoidable source of your emissions.",
                    "Giảm trực tiếp nguồn phát thải có thể tránh được lớn nhất của bạn.",
                ),
                estimated_co2_reduction_kg=reduction,
            )
        )

    # --- Rec 2: default short trips to EV when adoption < 90%. ---
    if ev < 90:
        reduction = 0.5 * avg_dist * _EV_SWITCH_DELTA_KG_PER_KM
        recs.append(
            Recommendation(
                title=_txt(
                    language,
                    "Use EV as the default for trips under 10 km",
                    "Mặc định chọn xe điện cho các chuyến dưới 10 km",
                ),
                reason=_txt(
                    language,
                    "Short trips are well suited to electric motorbikes.",
                    "Các chuyến ngắn rất phù hợp với xe máy điện.",
                ),
                estimated_co2_reduction_kg=reduction,
            )
        )

    # --- Rec 3: pattern-aware nudge, or reinforce good habits. ---
    if summary.highest_emission_day:
        recs.append(
            Recommendation(
                title=_txt(
                    language,
                    f"Reduce petrol rides on {summary.highest_emission_day}",
                    f"Giảm chuyến xe xăng vào {summary.highest_emission_day}",
                ),
                reason=_txt(
                    language,
                    f"{summary.highest_emission_day} has your highest emission contribution.",
                    f"{summary.highest_emission_day} là ngày bạn phát thải nhiều nhất.",
                ),
                estimated_co2_reduction_kg=0.3,
            )
        )
    elif ev >= 50:
        recs.append(
            Recommendation(
                title=_txt(
                    language,
                    "Keep up your daily EV habit",
                    "Duy trì thói quen đi xe điện hằng ngày",
                ),
                reason=_txt(
                    language,
                    "You are already among the greener commuters — consistency compounds.",
                    "Bạn đang nằm trong nhóm di chuyển xanh — duy trì đều đặn sẽ cộng dồn hiệu quả.",
                ),
                estimated_co2_reduction_kg=0.0,
            )
        )

    # Guarantee at least one recommendation even with empty/zero data.
    if not recs:
        recs.append(
            Recommendation(
                title=_txt(
                    language,
                    "Start logging trips to unlock tailored green tips",
                    "Bắt đầu ghi nhận chuyến đi để nhận gợi ý xanh phù hợp",
                ),
                reason=_txt(
                    language,
                    "We need a few trips to analyse your mobility pattern.",
                    "Cần một vài chuyến đi để phân tích thói quen di chuyển của bạn.",
                ),
                estimated_co2_reduction_kg=0.0,
            )
        )

    n_next = min(3, max(1, summary.petrol_trips)) if summary.petrol_trips else 1
    next_action = _txt(
        language,
        f"Choose an electric motorbike for your next {n_next} commute trip(s).",
        f"Chọn xe máy điện cho {n_next} chuyến đi làm tiếp theo.",
    )

    return RecommendationResult(
        summary=_mock_summary(summary, language),
        recommendations=recs[:3],  # spec returns up to 3
        next_best_action=next_action,
        provider=Provider.MOCK,
        model=_MOCK_MODEL_NAME,
    )


# ---------------------------------------------------------------------------
# Real-provider stubs — intentionally not implemented for the hackathon.
# ---------------------------------------------------------------------------

def _generate_openai(summary: MobilitySummary, scope: Scope, language: str) -> RecommendationResult:
    """FUTURE DIRECTION: call OpenAI Chat Completions.

    Sketch:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        prompt = build_prompt(summary.to_llm_input(), scope, language)
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                      {"role": "user", "content": prompt}],
        )
        return _parse_llm_json(resp.choices[0].message.content,
                               provider=Provider.OPENAI, model="gpt-4.1-mini")
    """
    raise NotImplementedError("OpenAI provider not enabled for the hackathon; use MOCK.")


def _generate_claude(summary: MobilitySummary, scope: Scope, language: str) -> RecommendationResult:
    """FUTURE DIRECTION: call Anthropic Claude Messages API.

    Sketch:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        msg = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user",
                       "content": build_prompt(summary.to_llm_input(), scope, language)}],
        )
        return _parse_llm_json(msg.content[0].text,
                               provider=Provider.CLAUDE, model="claude-3-5-sonnet")
    """
    raise NotImplementedError("Claude provider not enabled for the hackathon; use MOCK.")


def generate(
    summary: MobilitySummary,
    scope: Scope = Scope.EMPLOYEE,
    language: str = "en",
    provider: Provider = Provider.MOCK,
) -> RecommendationResult:
    """Provider-dispatching entry point.

    Defaults to MOCK. If a real provider is requested but errors (not enabled,
    missing key, network/quota failure), we **fall back to MOCK** so the demo
    never breaks — the returned `provider` then reflects MOCK, keeping the
    output honest about how it was produced.
    """
    if language not in ("en", "vi"):
        language = "en"

    if provider == Provider.MOCK:
        return _generate_mock(summary, scope, language)

    try:
        if provider == Provider.OPENAI:
            return _generate_openai(summary, scope, language)
        if provider == Provider.CLAUDE:
            return _generate_claude(summary, scope, language)
    except Exception:  # noqa: BLE001 — deliberate demo-safety fallback
        return _generate_mock(summary, scope, language)

    return _generate_mock(summary, scope, language)
