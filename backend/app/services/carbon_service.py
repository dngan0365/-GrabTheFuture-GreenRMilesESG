from fastapi import HTTPException, status
from app.core.carbon import VEHICLE_PROFILES, calculate_carbon, get_vehicle_class_profiles


def calculate(distance_km: float, vehicle_profile_id: str) -> dict:
    if vehicle_profile_id not in VEHICLE_PROFILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": f"Unknown vehicleProfileId: {vehicle_profile_id}"},
        )

    profile = VEHICLE_PROFILES[vehicle_profile_id]
    baseline_id = profile["baselineProfileId"]
    baseline = VEHICLE_PROFILES[baseline_id]
    carbon = calculate_carbon(distance_km, vehicle_profile_id)

    return {
        "input": {"distanceKm": distance_km, "vehicleProfileId": vehicle_profile_id},
        "selectedVehicle": {
            "vehicleProfileId": vehicle_profile_id,
            "displayName": profile["displayName"],
            "vehicleClass": profile["vehicleClass"],
            "powertrain": profile["powertrain"],
            "co2KgPerKm": profile["co2KgPerKm"],
        },
        "baselineVehicle": {
            "vehicleProfileId": baseline_id,
            "displayName": baseline["displayName"],
            "co2KgPerKm": baseline["co2KgPerKm"],
        },
        "result": {
            "baselineCo2Kg": carbon.baseline_co2_kg,
            "actualCo2Kg": carbon.actual_co2_kg,
            "co2SavedKg": carbon.co2_saved_kg,
            "fuelSavedLiters": carbon.fuel_saved_liters,
            "treeEquivalent": carbon.tree_equivalent,
        },
        "methodology": {
            "runtimeFormula": "distanceKm * co2KgPerKm",
            "baselineLogic": "EV profiles are compared against petrol vehicles from the same class.",
            "treeFormula": "co2SavedKg / 21.77",
        },
    }


def compare(distance_km: float, vehicle_class: str) -> dict:
    profile_ids = get_vehicle_class_profiles(vehicle_class)
    if not profile_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": f"Unknown vehicleClass: {vehicle_class}"},
        )

    options = []
    for pid in profile_ids:
        profile = VEHICLE_PROFILES[pid]
        carbon = calculate_carbon(distance_km, pid)
        options.append({
            "vehicleProfileId": pid,
            "displayName": profile["displayName"],
            "actualCo2Kg": carbon.actual_co2_kg,
            "baselineCo2Kg": carbon.baseline_co2_kg,
            "co2SavedKg": carbon.co2_saved_kg,
            "fuelSavedLiters": carbon.fuel_saved_liters,
            "treeEquivalent": carbon.tree_equivalent,
            "recommended": profile["powertrain"] == "ELECTRIC",
        })

    # Sort: EV first (recommended), then by co2SavedKg desc
    options.sort(key=lambda x: (-x["recommended"], -x["co2SavedKg"]))

    return {"distanceKm": distance_km, "vehicleClass": vehicle_class, "options": options}
