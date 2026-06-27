from dataclasses import dataclass

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


@dataclass
class RouteDistance:
    origin_name: str
    destination_name: str
    distance_km: float
    duration_minutes: int | None
    provider: str


async def _goong_geocode(client: httpx.AsyncClient, address: str) -> tuple[float, float]:
    response = await client.get(
        "https://rsapi.goong.io/Geocode",
        params={"address": address, "api_key": settings.GOONG_API_KEY},
    )
    response.raise_for_status()
    data = response.json()
    results = data.get("results") or []
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ROUTE_NOT_FOUND", "message": f"Cannot geocode address: {address}"},
        )

    location = results[0]["geometry"]["location"]
    return float(location["lat"]), float(location["lng"])


async def get_route_distance(origin_name: str, destination_name: str, vehicle: str = "car") -> RouteDistance:
    if not settings.GOONG_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DISTANCE_PROVIDER_NOT_CONFIGURED",
                "message": "Set GOONG_API_KEY to calculate route distance from origin and destination.",
            },
        )

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            origin_lat, origin_lng = await _goong_geocode(client, origin_name)
            dest_lat, dest_lng = await _goong_geocode(client, destination_name)
            response = await client.get(
                "https://rsapi.goong.io/Direction",
                params={
                    "origin": f"{origin_lat},{origin_lng}",
                    "destination": f"{dest_lat},{dest_lng}",
                    "vehicle": vehicle,
                    "api_key": settings.GOONG_API_KEY,
                },
            )
            response.raise_for_status()
            data = response.json()
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "DISTANCE_PROVIDER_ERROR", "message": str(exc)},
        ) from exc

    routes = data.get("routes") or []
    if not routes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ROUTE_NOT_FOUND", "message": "No route found for the provided locations."},
        )

    leg = (routes[0].get("legs") or [{}])[0]
    distance_m = float((leg.get("distance") or {}).get("value", 0))
    duration_s = int((leg.get("duration") or {}).get("value", 0))

    return RouteDistance(
        origin_name=origin_name,
        destination_name=destination_name,
        distance_km=round(distance_m / 1000, 3),
        duration_minutes=round(duration_s / 60) if duration_s else None,
        provider="GOONG",
    )
