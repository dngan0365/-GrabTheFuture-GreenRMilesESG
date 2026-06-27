"""
=============================================================================
TEMPORARY DEMO DATA SAMPLER  —  TODO(REMOVE FOR PRODUCTION)
=============================================================================
This module FABRICATES plausible mobility data so the ML endpoints
(/prediction/*, /recommendation) work end-to-end BEFORE the database query
layer exists.

>>> DELETE THIS ENTIRE FILE once the DB layer is wired. <<<

Each function here corresponds to a real aggregation query over the `rides`
table (see DatabaseSpec.md Section 5). The route handlers call these samplers
and are annotated with the exact SQL that should replace them. The numbers are
deterministic (seeded RNG) so the demo is stable across runs.
=============================================================================
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List

from app.services.prediction import DailyPoint
from app.services.recommendation import MobilitySummary, Scope

# Blended CO2 factors (kg/km) across vehicle classes — demo only.
_EV_CO2_PER_KM = 0.05
_PETROL_CO2_PER_KM = 0.11
_PETROL_FUEL_L_PER_KM = 0.05  # ~5 L/100km blended baseline

# Demo company monthly emission target (mirrors seed Company A = 15000 kg).
DEMO_COMPANY_TARGET_MONTHLY_KG = 15000.0


@dataclass
class DemoAggregate:
    """A fabricated daily series + its rolled-up totals (stand-in for SQL)."""

    points: List[DailyPoint]
    total_trips: int
    ev_trips: int
    petrol_trips: int
    total_distance_km: float
    actual_emission_kg: float
    baseline_emission_kg: float
    saved_emission_kg: float
    fuel_saved_liters: float

    @property
    def ev_rate_pct(self) -> float:
        if self.total_trips <= 0:
            return 0.0
        return round(self.ev_trips / self.total_trips * 100, 1)


def _sample(
    start: date,
    end: date,
    *,
    trips_per_day: float,
    ev_rate: float,
    seed: int,
    trend_per_day: float = 0.01,
) -> DemoAggregate:
    """Generate a deterministic daily mobility series for [start, end].

    Models a mild upward trend and a weekend dip so the regression has real
    structure to learn. TODO(REMOVE): replace with a GROUP BY date query.
    """
    rng = random.Random(seed)
    points: List[DailyPoint] = []
    total_trips = ev_trips = petrol_trips = 0
    total_distance = actual = baseline = saved = fuel = 0.0

    n_days = (end - start).days + 1
    for i in range(max(0, n_days)):
        day = start + timedelta(days=i)
        weekend = day.weekday() >= 5
        weekend_factor = 0.4 if weekend else 1.0
        trend_factor = 1.0 + trend_per_day * i

        trips_today = max(
            0, round(trips_per_day * weekend_factor * trend_factor * rng.uniform(0.85, 1.15))
        )
        day_emission = day_saved = 0.0
        for _ in range(trips_today):
            dist = rng.uniform(4.0, 16.0)
            total_distance += dist
            is_ev = rng.random() < ev_rate
            base = dist * _PETROL_CO2_PER_KM
            baseline += base
            if is_ev:
                ev_trips += 1
                act = dist * _EV_CO2_PER_KM
                actual += act
                sv = base - act
                saved += sv
                fuel += dist * _PETROL_FUEL_L_PER_KM
                day_emission += act
                day_saved += sv
            else:
                petrol_trips += 1
                actual += base
                day_emission += base
        total_trips += trips_today
        points.append(DailyPoint(day=day, emission_kg=round(day_emission, 3), saved_kg=round(day_saved, 3)))

    return DemoAggregate(
        points=points,
        total_trips=total_trips,
        ev_trips=ev_trips,
        petrol_trips=petrol_trips,
        total_distance_km=round(total_distance, 3),
        actual_emission_kg=round(actual, 3),
        baseline_emission_kg=round(baseline, 3),
        saved_emission_kg=round(saved, 3),
        fuel_saved_liters=round(fuel, 3),
    )


def sample_company_series(company_id: str, period_from: date, observed_to: date) -> DemoAggregate:
    """Company-scale daily emissions from period_from..observed_to (today).

    TODO(REMOVE): replace with the /company/dashboard aggregation grouped by
    day:  SELECT date(created_at), SUM(actual_co2_kg), SUM(co2_saved_kg) ...
          FROM rides WHERE company_id=$1 AND status='COMPLETED'
          AND created_at BETWEEN period_from AND observed_to GROUP BY 1.
    """
    seed = abs(hash((company_id, period_from.isoformat()))) % (2**31)
    return _sample(period_from, observed_to, trips_per_day=160, ev_rate=0.62, seed=seed)


def sample_employee_series(user_id: str, basis_from: date, basis_to: date) -> DemoAggregate:
    """Single-employee daily emissions for the basis week.

    TODO(REMOVE): replace with per-user daily aggregation:
          SELECT date(created_at), SUM(actual_co2_kg), SUM(co2_saved_kg) ...
          FROM rides WHERE user_id=$1 AND status='COMPLETED'
          AND created_at BETWEEN basis_from AND basis_to GROUP BY 1.
    """
    seed = abs(hash((user_id, basis_from.isoformat()))) % (2**31)
    return _sample(basis_from, basis_to, trips_per_day=1.6, ev_rate=0.6, seed=seed)


def sample_mobility_summary(
    scope: Scope, subject_id: str, period_from: date, period_to: date
) -> MobilitySummary:
    """Aggregated MobilitySummary for the recommendation endpoint.

    TODO(REMOVE): replace with the scope-appropriate aggregation over rides
    (employee -> by user_id, company -> by company_id, department -> by
    department_id) per DatabaseSpec.md Section 5, plus pattern queries for
    highest-emission day/vehicle.
    """
    if scope == Scope.EMPLOYEE:
        agg = _sample(period_from, period_to, trips_per_day=0.8, ev_rate=0.67,
                      seed=abs(hash(("emp", subject_id))) % (2**31))
        department = "Engineering"
        user_id = subject_id
    else:  # COMPANY or DEPARTMENT
        agg = _sample(period_from, period_to, trips_per_day=140, ev_rate=0.62,
                      seed=abs(hash(("co", subject_id))) % (2**31))
        department = None if scope == Scope.COMPANY else "Sales"
        user_id = None

    return MobilitySummary(
        total_trips=agg.total_trips,
        ev_trips=agg.ev_trips,
        petrol_trips=agg.petrol_trips,
        total_distance_km=agg.total_distance_km,
        actual_emission_kg=agg.actual_emission_kg,
        baseline_emission_kg=agg.baseline_emission_kg,
        saved_emission_kg=agg.saved_emission_kg,
        fuel_saved_liters=agg.fuel_saved_liters,
        green_points=int(agg.saved_emission_kg * 100),
        highest_emission_vehicle="MOTORBIKE_PETRO",
        most_common_vehicle="MOTORBIKE_ELECTRIC",
        highest_emission_day="Monday",
        user_id=user_id,
        department=department,
    )
