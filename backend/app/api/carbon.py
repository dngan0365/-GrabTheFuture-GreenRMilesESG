from fastapi import APIRouter

from app.core.carbon import VEHICLE_PROFILES
from app.schemas.carbon import CarbonCalculateRequest, CarbonCompareRequest, RouteDistanceRequest
from app.services import carbon_service
from app.services.distance_service import autocomplete_places, get_route_distance

router = APIRouter(prefix="/carbon", tags=["carbon"])


@router.get("/places/autocomplete")
async def places_autocomplete(input: str = ""):
    return {"predictions": await autocomplete_places(input)}


@router.get("/vehicles")
async def list_vehicle_profiles():
    return {
        "items": [
            {
                "vehicleProfileId": profile_id,
                "displayName": profile["displayName"],
                "vehicleClass": profile["vehicleClass"],
                "powertrain": profile["powertrain"],
                "co2KgPerKm": profile["co2KgPerKm"],
                "baselineProfileId": profile["baselineProfileId"],
            }
            for profile_id, profile in VEHICLE_PROFILES.items()
        ]
    }


@router.post("/calculate")
async def calculate(payload: CarbonCalculateRequest):
    return carbon_service.calculate(payload.distanceKm, payload.vehicleProfileId)


@router.post("/compare")
async def compare(payload: CarbonCompareRequest):
    return carbon_service.compare(payload.distanceKm, payload.vehicleClass)


@router.post("/distance")
async def distance(payload: RouteDistanceRequest):
    route = await get_route_distance(payload.originName, payload.destinationName, payload.vehicle)
    return {
        "originName": route.origin_name,
        "destinationName": route.destination_name,
        "distanceKm": route.distance_km,
        "durationMinutes": route.duration_minutes,
        "provider": route.provider,
        "originLat": route.origin_lat,
        "originLng": route.origin_lng,
        "destLat": route.dest_lat,
        "destLng": route.dest_lng,
        "overviewPolyline": route.overview_polyline,
    }

