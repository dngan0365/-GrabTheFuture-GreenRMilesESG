"""Unit tests for the AI recommendation service.

Run from backend/:
    python tests/test_recommendation.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.recommendation import (  # noqa: E402
    MobilitySummary,
    Provider,
    Scope,
    generate,
)

# Spec keys that every output_json must contain (Section 12).
_REQUIRED_KEYS = {"summary", "recommendations", "nextBestAction", "model"}
_REC_KEYS = {"title", "reason", "estimatedCo2ReductionKg"}


def _employee_summary():
    return MobilitySummary(
        total_trips=24,
        ev_trips=16,
        petrol_trips=8,
        total_distance_km=318.4,
        actual_emission_kg=21.0,
        baseline_emission_kg=34.8,
        saved_emission_kg=13.8,
        fuel_saved_liters=4.2,
        green_points=1380,
        highest_emission_day="Monday",
        user_id="usr_001",
        department="Engineering",
    )


def test_output_matches_spec_shape():
    res = generate(_employee_summary(), scope=Scope.EMPLOYEE, language="en")
    out = res.to_output_json(scope=Scope.EMPLOYEE)
    assert _REQUIRED_KEYS.issubset(out.keys()), out.keys()
    assert out["scope"] == "employee"
    assert out["model"]["provider"] == "MOCK"
    assert 1 <= len(out["recommendations"]) <= 3
    for r in out["recommendations"]:
        assert _REC_KEYS == set(r.keys()), r.keys()
        assert isinstance(r["estimatedCo2ReductionKg"], (int, float))
    print(f"[shape] recs={len(out['recommendations'])} keys ok")


def test_petrol_trips_yield_positive_reduction():
    res = generate(_employee_summary(), language="en")
    # The first rec (switch petrol -> EV) must estimate a real reduction.
    top = res.recommendations[0]
    assert top.estimated_co2_reduction_kg > 0, top
    print(f"[reduction] top='{top.title}' kg={top.estimated_co2_reduction_kg}")


def test_language_vi_differs_from_en():
    en = generate(_employee_summary(), language="en")
    vi = generate(_employee_summary(), language="vi")
    assert en.summary != vi.summary
    assert en.next_best_action != vi.next_best_action
    # Vietnamese summary should contain Vietnamese-specific characters/words.
    assert any(ch in vi.summary for ch in "đãạảượ") or "xe" in vi.summary
    print(f"[i18n] en='{en.summary[:30]}...' vi='{vi.summary[:30]}...'")


def test_high_ev_rate_summary_differs_from_low():
    high = generate(
        MobilitySummary(total_trips=10, ev_trips=9, petrol_trips=1, total_distance_km=80),
        language="en",
    )
    low = generate(
        MobilitySummary(total_trips=10, ev_trips=1, petrol_trips=9, total_distance_km=80),
        language="en",
    )
    assert high.summary != low.summary
    print(f"[adaptive] high!='{high.summary[:25]}' low='{low.summary[:25]}'")


def test_empty_summary_still_returns_one_recommendation():
    res = generate(MobilitySummary(), language="en")
    assert len(res.recommendations) >= 1
    assert res.next_best_action
    print(f"[empty] recs={len(res.recommendations)}")


def test_unknown_provider_falls_back_to_mock():
    # OPENAI is a stub that raises -> generate() must fall back to MOCK.
    res = generate(_employee_summary(), provider=Provider.OPENAI)
    assert res.provider == Provider.MOCK
    assert res.recommendations
    print(f"[fallback] provider={res.provider.value}")


def test_unknown_language_defaults_to_en():
    res_en = generate(_employee_summary(), language="en")
    res_xx = generate(_employee_summary(), language="fr")  # unsupported
    assert res_xx.summary == res_en.summary
    print("[lang-default] unsupported -> en")


def test_to_llm_input_is_spec_shaped():
    s = _employee_summary()
    payload = s.to_llm_input()
    assert payload["mobilitySummary"]["evRate"] == s.ev_rate_pct
    assert payload["patterns"]["highestEmissionDay"] == "Monday"
    assert payload["profile"]["userId"] == "usr_001"
    print(f"[llm-input] evRate={payload['mobilitySummary']['evRate']}")


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
