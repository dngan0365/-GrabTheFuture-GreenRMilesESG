"""
Emission Prediction Service — AI Model 1.

Implements a small, dependency-light **linear regression** over a daily
emission time-series and projects it forward to a target horizon.

Why linear regression (and not something heavier)?
---------------------------------------------------
The series we predict on is tiny:
  * Company month-end  -> ~20-30 daily points
  * Employee next-week ->  ~7 daily points
With that little data, complex models (ARIMA / boosting / LSTM) overfit and
generalise worse than a regularised straight line. The dominant structure in
commuting-emission data is (a) a slow trend across the period and (b) a
day-of-week effect (weekends dip). A ridge-regularised linear model with a
trend term + day-of-week features captures both without overfitting.

The model is adaptive:
  * >= 14 points         -> trend + day-of-week seasonality (full model)
  *  >= 3 and < 14 points -> trend only
  *  < 3 points          -> mean fallback (cannot fit a slope reliably)

The service is intentionally decoupled from the database: callers pass in an
ordered daily series and a horizon, so it is trivially unit-testable. The route
layer is responsible for turning ride rows into the daily series.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import List, Optional, Sequence

import numpy as np

# Number of daily points required before we trust day-of-week seasonality.
_SEASONALITY_MIN_POINTS = 14
# Number of daily points required before we trust a fitted trend slope.
_TREND_MIN_POINTS = 3
# Ridge penalty — mild, just enough to keep the fit stable on few points /
# near-collinear weekday dummies. Features are standardized, so this acts on an
# ~O(1) scale and introduces only a small bias on clean signals.
_RIDGE_ALPHA = 0.1


@dataclass
class DailyPoint:
    """One day of aggregated emission data."""

    day: date
    emission_kg: float
    saved_kg: float = 0.0


@dataclass
class PredictionResult:
    """Output of a projection over a future horizon."""

    predicted_emission_kg: float
    predicted_saved_kg: float
    confidence: float
    model_id: str
    model_type: str
    # Per-day projected emissions for the horizon (useful for charts / tests).
    daily_forecast_kg: List[float] = field(default_factory=list)


def _ridge_fit(X: np.ndarray, y: np.ndarray, alpha: float = _RIDGE_ALPHA) -> np.ndarray:
    """Ridge regression via the augmented least-squares formulation.

    Instead of the normal equations (XᵀX + αI)β = Xᵀy — which square the
    condition number and are numerically fragile — we stack penalty rows onto
    the design matrix and solve with ``lstsq``:

        [   X   ]        [ y ]
        [ √α·Iₚ ] β  ≈   [ 0 ]

    where Iₚ penalises every coefficient *except* the intercept (column 0).
    This is far better conditioned and avoids divide/overflow warnings.
    """
    n, k = X.shape
    penalty_rows = []
    for j in range(1, k):  # skip intercept column 0
        row = np.zeros(k)
        row[j] = np.sqrt(alpha)
        penalty_rows.append(row)
    if penalty_rows:
        A = np.vstack([X, np.array(penalty_rows)])
        b = np.concatenate([y, np.zeros(len(penalty_rows))])
    else:
        A, b = X, y
    beta, *_ = np.linalg.lstsq(A, b, rcond=None)
    return beta


def _design_matrix(
    day_index: np.ndarray,
    weekday: np.ndarray,
    use_seasonality: bool,
    trend_mean: float,
    trend_std: float,
) -> np.ndarray:
    """Build [intercept, standardized trend, weekday dummies?] design matrix.

    The trend column is standardized using the *training* mean/std so the
    feature scale stays ~O(1). This keeps the system well conditioned and makes
    the ridge penalty act sensibly across features. Weekday is encoded as 6
    dummy columns (Monday is the reference category), so the intercept absorbs
    Monday and each dummy is that weekday's offset.
    """
    n = day_index.shape[0]
    trend = (day_index.astype(float) - trend_mean) / trend_std
    cols = [np.ones(n), trend]
    if use_seasonality:
        # Monday=0 ... Sunday=6 ; reference = Monday, so dummies for 1..6.
        for wd in range(1, 7):
            cols.append((weekday == wd).astype(float))
    return np.column_stack(cols)


def _r_squared(y: np.ndarray, y_hat: np.ndarray) -> float:
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    if ss_tot <= 1e-12:
        # Constant series — a flat line fits perfectly.
        return 1.0
    return 1.0 - ss_res / ss_tot


def _confidence(r2: float, n_points: int, model_type: str) -> float:
    """Heuristic confidence in [0.5, 0.95].

    Combines goodness-of-fit (R²) with a data-volume factor so that a clean fit
    on many days reports higher confidence than the same fit on a handful of
    days. Mean-fallback predictions are capped lower since they ignore trend.
    """
    r2 = max(0.0, min(1.0, r2))
    # More data -> closer to 1.0 (≈0.6 at 3 pts, ≈0.8 at 14 pts, →1 asymptote).
    data_factor = n_points / (n_points + 6.0)
    raw = 0.5 + 0.45 * r2 * data_factor
    if model_type == "MEAN_FALLBACK":
        raw = min(raw, 0.6)
    return round(max(0.5, min(0.95, raw)), 2)


def fit_and_project(
    series: Sequence[DailyPoint],
    horizon_days: int,
    horizon_start: Optional[date] = None,
    model_id: str = "emission_regression_v1",
) -> PredictionResult:
    """Fit a regression on ``series`` and project ``horizon_days`` forward.

    Parameters
    ----------
    series:
        Ordered (ascending day) daily emission points to learn from.
    horizon_days:
        Number of future days to project and sum.
    horizon_start:
        First day of the projected horizon (used for weekday seasonality). If
        omitted, it defaults to the day after the last observed day.
    model_id:
        Identifier echoed back for prediction logging.
    """
    if horizon_days <= 0:
        return PredictionResult(0.0, 0.0, 0.5, model_id, "MEAN_FALLBACK", [])

    pts = list(series)
    n = len(pts)

    # --- saved_kg is projected by the same ratio as emission, so we scale it.
    total_emission = sum(p.emission_kg for p in pts)
    total_saved = sum(p.saved_kg for p in pts)
    saved_ratio = (total_saved / total_emission) if total_emission > 1e-9 else 0.0

    if horizon_start is None:
        horizon_start = (pts[-1].day + timedelta(days=1)) if pts else date.today()

    future_days = [horizon_start + timedelta(days=i) for i in range(horizon_days)]
    future_weekday = np.array([d.weekday() for d in future_days])

    # ---- Fallback: too few points to fit a slope -> use daily mean. ----
    if n < _TREND_MIN_POINTS:
        daily_mean = (total_emission / n) if n else 0.0
        forecast = [max(0.0, daily_mean)] * horizon_days
        predicted_emission = float(sum(forecast))
        return PredictionResult(
            predicted_emission_kg=round(predicted_emission, 3),
            predicted_saved_kg=round(predicted_emission * saved_ratio, 3),
            confidence=_confidence(0.0, n, "MEAN_FALLBACK"),
            model_id=model_id,
            model_type="MEAN_FALLBACK",
            daily_forecast_kg=[round(v, 3) for v in forecast],
        )

    use_seasonality = n >= _SEASONALITY_MIN_POINTS
    model_type = "LINEAR_REGRESSION"

    day_index = np.arange(n)
    weekday = np.array([p.day.weekday() for p in pts])
    y = np.array([p.emission_kg for p in pts], dtype=float)

    # Standardize the trend feature using training stats (reused for forecast).
    trend_mean = float(day_index.mean())
    trend_std = float(day_index.std()) or 1.0

    X = _design_matrix(day_index, weekday, use_seasonality, trend_mean, trend_std)
    beta = _ridge_fit(X, y)

    # In-sample fit quality for the confidence estimate.
    y_hat = X @ beta
    r2 = _r_squared(y, y_hat)

    # Project the horizon. Continue the day index past the observed window.
    future_index = np.arange(n, n + horizon_days)
    X_future = _design_matrix(
        future_index, future_weekday, use_seasonality, trend_mean, trend_std
    )
    forecast = X_future @ beta
    # Emissions cannot be negative.
    forecast = np.clip(forecast, 0.0, None)

    predicted_emission = float(np.sum(forecast))

    return PredictionResult(
        predicted_emission_kg=round(predicted_emission, 3),
        predicted_saved_kg=round(predicted_emission * saved_ratio, 3),
        confidence=_confidence(r2, n, model_type),
        model_id=model_id,
        model_type=model_type,
        daily_forecast_kg=[round(float(v), 3) for v in forecast],
    )


def project_to_month_end(
    series: Sequence[DailyPoint],
    period_from: date,
    period_to: date,
    today: Optional[date] = None,
    model_id: str = "monthly_regression_v1",
) -> PredictionResult:
    """Company month-end projection (BackendSpec 11.1).

    ``series`` are the observed daily points so far (period_from..today). The
    prediction is current observed total + regression forecast of the
    remaining days through ``period_to``.
    """
    today = today or date.today()
    observed_to = min(today, period_to)
    remaining_days = (period_to - observed_to).days
    if remaining_days < 0:
        remaining_days = 0

    observed_emission = sum(p.emission_kg for p in series)
    observed_saved = sum(p.saved_kg for p in series)

    forecast = fit_and_project(
        series,
        horizon_days=remaining_days,
        horizon_start=observed_to + timedelta(days=1),
        model_id=model_id,
    )

    return PredictionResult(
        predicted_emission_kg=round(observed_emission + forecast.predicted_emission_kg, 3),
        predicted_saved_kg=round(observed_saved + forecast.predicted_saved_kg, 3),
        confidence=forecast.confidence,
        model_id=model_id,
        model_type=forecast.model_type,
        daily_forecast_kg=forecast.daily_forecast_kg,
    )


def project_next_week(
    series: Sequence[DailyPoint],
    next_week_start: date,
    model_id: str = "next_week_employee_v1",
) -> PredictionResult:
    """Employee next-week projection (BackendSpec 11.2).

    Projects a full 7-day week starting at ``next_week_start``.
    """
    return fit_and_project(
        series,
        horizon_days=7,
        horizon_start=next_week_start,
        model_id=model_id,
    )
