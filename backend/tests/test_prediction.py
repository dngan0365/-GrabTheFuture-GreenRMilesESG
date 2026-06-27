"""Unit tests for the emission prediction regression service.

Run from the backend/ directory:
    python -m pytest tests/test_prediction.py -v
or without pytest:
    python tests/test_prediction.py
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta

# Allow running directly (python tests/test_prediction.py) without install.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.prediction import (  # noqa: E402
    DailyPoint,
    fit_and_project,
    project_next_week,
    project_to_month_end,
)


def _series(start: date, values):
    return [DailyPoint(day=start + timedelta(days=i), emission_kg=v) for i, v in enumerate(values)]


def test_recovers_linear_trend():
    """A clean increasing line should extrapolate to the next value."""
    start = date(2026, 6, 1)
    # y = 10 + 2*i  for i = 0..13  -> next 7 days continue the slope.
    values = [10 + 2 * i for i in range(14)]
    res = fit_and_project(_series(start, values), horizon_days=7)

    # Day 14 expected ~38, ... day 20 ~50. Sum of 38..50 step 2 = 308.
    expected = sum(10 + 2 * i for i in range(14, 21))
    # Ridge intentionally biases slightly toward zero, so allow ~2% slack
    # rather than demanding exact OLS recovery.
    assert abs(res.predicted_emission_kg - expected) / expected < 0.02, res.predicted_emission_kg
    assert res.model_type == "LINEAR_REGRESSION"
    assert res.confidence > 0.8  # clean fit, plenty of points
    print(f"[trend] predicted={res.predicted_emission_kg} expected={expected} conf={res.confidence}")


def test_captures_weekday_seasonality():
    """Weekend dips should be reflected in the forecast when enough data."""
    start = date(2026, 6, 1)  # Monday
    # Weekdays = 100, weekends = 20, over 3 weeks (21 pts).
    values = []
    d = start
    for _ in range(21):
        values.append(20.0 if d.weekday() >= 5 else 100.0)
        d += timedelta(days=1)
    res = fit_and_project(_series(start, values), horizon_days=7)

    # The 7-day forecast should sum to ≈ 5*100 + 2*20 = 540.
    assert abs(res.predicted_emission_kg - 540.0) < 40.0, res.predicted_emission_kg
    # Forecast weekend days should be much lower than weekday days.
    forecast = res.daily_forecast_kg
    assert max(forecast) > 3 * min(forecast), forecast
    print(f"[seasonality] sum={res.predicted_emission_kg} daily={forecast} conf={res.confidence}")


def test_sparse_data_uses_mean_fallback():
    start = date(2026, 6, 1)
    res = fit_and_project(_series(start, [10.0, 14.0]), horizon_days=5)
    assert res.model_type == "MEAN_FALLBACK"
    # mean = 12 -> 5 days = 60
    assert abs(res.predicted_emission_kg - 60.0) < 1e-6, res.predicted_emission_kg
    assert res.confidence <= 0.6
    print(f"[fallback] predicted={res.predicted_emission_kg} conf={res.confidence}")


def test_forecast_never_negative():
    start = date(2026, 6, 1)
    # Steeply decreasing line would extrapolate below zero without clipping.
    values = [50 - 4 * i for i in range(12)]
    res = fit_and_project(_series(start, values), horizon_days=7)
    assert min(res.daily_forecast_kg) >= 0.0, res.daily_forecast_kg
    assert res.predicted_emission_kg >= 0.0
    print(f"[non-negative] daily={res.daily_forecast_kg}")


def test_saved_kg_scales_with_ratio():
    start = date(2026, 6, 1)
    pts = [
        DailyPoint(day=start + timedelta(days=i), emission_kg=100.0, saved_kg=40.0)
        for i in range(14)
    ]
    res = fit_and_project(pts, horizon_days=7)
    # saved should be ~40% of predicted emission.
    ratio = res.predicted_saved_kg / res.predicted_emission_kg
    assert abs(ratio - 0.4) < 0.05, ratio
    print(f"[saved] emission={res.predicted_emission_kg} saved={res.predicted_saved_kg} ratio={ratio:.3f}")


def test_month_end_projection_adds_observed():
    """project_to_month_end = observed so far + forecast of remaining days."""
    period_from = date(2026, 6, 1)
    period_to = date(2026, 6, 30)
    today = date(2026, 6, 20)  # 20 days observed, 10 remaining
    # Flat 100/day observed.
    series = _series(period_from, [100.0] * 20)
    res = project_to_month_end(series, period_from, period_to, today=today)

    observed = 20 * 100.0
    # Flat series -> remaining 10 days ≈ 100 each -> total ≈ 3000.
    assert abs(res.predicted_emission_kg - 3000.0) < 50.0, res.predicted_emission_kg
    assert res.predicted_emission_kg > observed
    print(f"[month-end] predicted={res.predicted_emission_kg} (observed={observed})")


def test_next_week_returns_seven_days():
    start = date(2026, 6, 1)
    values = [10 + i for i in range(14)]
    res = project_next_week(_series(start, values), next_week_start=date(2026, 6, 15))
    assert len(res.daily_forecast_kg) == 7
    assert res.model_id == "next_week_employee_v1"
    print(f"[next-week] daily={res.daily_forecast_kg} conf={res.confidence}")


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
