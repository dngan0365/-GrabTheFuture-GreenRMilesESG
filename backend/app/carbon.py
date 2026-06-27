"""
Central module for all carbon math.
Backend owns all carbon calculations – never trust FE-computed values.
"""
from dataclasses import dataclass
from typing import Optional

# ── Vehicle Profile Constants ─────────────────────────────────────────────────

VEHICLE_PROFILES = {
    "MOTORBIKE_PETRO": {
        "displayName": "Petrol Motorbike",
        "vehicleClass": "MOTORBIKE",
        "powertrain": "PETRO",
        "co2KgPerKm": 0.05,
        "energyUsageLPer100Km": 2.12,
        "baselineProfileId": "MOTORBIKE_PETRO",
    },
    "MOTORBIKE_ELECTRIC": {
        "displayName": "Electric Motorbike",
        "vehicleClass": "MOTORBIKE",
        "powertrain": "ELECTRIC",
        "co2KgPerKm": 0.024,
        "energyUsageWhPerKm": 36.5,
        "baselineProfileId": "MOTORBIKE_PETRO",
    },
    "CAR_4_PETRO": {
        "displayName": "Petrol 4-seat Car",
        "vehicleClass": "CAR_4",
        "powertrain": "PETRO",
        "co2KgPerKm": 0.14,
        "energyUsageLPer100Km": 6.25,
        "baselineProfileId": "CAR_4_PETRO",
    },
    "CAR_4_ELECTRIC": {
        "displayName": "Electric 4-seat Car",
        "vehicleClass": "CAR_4",
        "powertrain": "ELECTRIC",
        "co2KgPerKm": 0.084,
        "energyUsageWhPerKm": 127.0,
        "baselineProfileId": "CAR_4_PETRO",
    },
    "SUV_7_PETRO": {
        "displayName": "Petrol 7-seat / SUV",
        "vehicleClass": "SUV_7",
        "powertrain": "PETRO",
        "co2KgPerKm": 0.22,
        "energyUsageLPer100Km": 9.36,
        "baselineProfileId": "SUV_7_PETRO",
    },
    "SUV_7_ELECTRIC": {
        "displayName": "Electric 7-seat / SUV",
        "vehicleClass": "SUV_7",
        "powertrain": "ELECTRIC",
        "co2KgPerKm": 0.127,
        "energyUsageWhPerKm": 192.5,
        "baselineProfileId": "SUV_7_PETRO",
    },
}

TREE_CO2_KG = 21.77  # kg CO₂ absorbed per tree per year


@dataclass
class CarbonResult:
    baseline_profile_id: str
    baseline_co2_kg: float
    actual_co2_kg: float
    co2_saved_kg: float
    fuel_saved_liters: float
    tree_equivalent: float


@dataclass
class RewardResult:
    green_points_added: int
    green_score_added: int


def calculate_carbon(distance_km: float, vehicle_profile_id: str) -> CarbonResult:
    """Core carbon calculation. All values rounded to 3 decimal places."""
    profile = VEHICLE_PROFILES[vehicle_profile_id]
    baseline_id = profile["baselineProfileId"]
    baseline = VEHICLE_PROFILES[baseline_id]

    baseline_co2 = round(distance_km * baseline["co2KgPerKm"], 3)
    actual_co2 = round(distance_km * profile["co2KgPerKm"], 3)
    co2_saved = round(max(0.0, baseline_co2 - actual_co2), 3)

    fuel_saved = 0.0
    if profile["powertrain"] == "ELECTRIC":
        baseline_l_per_100km = baseline.get("energyUsageLPer100Km", 0)
        fuel_saved = round(distance_km * baseline_l_per_100km / 100, 3)

    tree_eq = round(co2_saved / TREE_CO2_KG, 3)

    return CarbonResult(
        baseline_profile_id=baseline_id,
        baseline_co2_kg=baseline_co2,
        actual_co2_kg=actual_co2,
        co2_saved_kg=co2_saved,
        fuel_saved_liters=fuel_saved,
        tree_equivalent=tree_eq,
    )


def calculate_reward(co2_saved_kg: float) -> RewardResult:
    return RewardResult(
        green_points_added=round(co2_saved_kg * 100),
        green_score_added=round(co2_saved_kg * 10),
    )


def get_vehicle_class_profiles(vehicle_class: str) -> list[str]:
    return [pid for pid, p in VEHICLE_PROFILES.items() if p["vehicleClass"] == vehicle_class]