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
    origin_lat: float | None = None
    origin_lng: float | None = None
    dest_lat: float | None = None
    dest_lng: float | None = None
    overview_polyline: str | None = None


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
    overview = (routes[0].get("overview_polyline") or {}).get("points")

    return RouteDistance(
        origin_name=origin_name,
        destination_name=destination_name,
        distance_km=round(distance_m / 1000, 3),
        duration_minutes=round(duration_s / 60) if duration_s else None,
        provider="GOONG",
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        overview_polyline=overview,
    )


async def autocomplete_places(input_text: str, limit: int = 6) -> list[dict]:
    """Proxy Goong Place AutoComplete so the REST key stays server-side.

    Returns a list of {description, placeId}. If the provider is not configured
    or the call fails, returns an empty list so the UI can fall back to free
    text entry instead of erroring.
    """
    query = (input_text or "").strip()
    if not settings.GOONG_API_KEY or len(query) < 2:
        return []

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                "https://rsapi.goong.io/Place/AutoComplete",
                params={"api_key": settings.GOONG_API_KEY, "input": query, "limit": limit},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return []

    predictions = data.get("predictions") or []
    return [
        {"description": p.get("description", ""), "placeId": p.get("place_id", "")}
        for p in predictions
        if p.get("description")
    ][:limit]
