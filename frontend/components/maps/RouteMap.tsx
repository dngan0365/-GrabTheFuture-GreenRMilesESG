"use client";

import { useEffect, useRef } from "react";
import "@goongmaps/goong-js/dist/goong-js.css";
import { MapPin } from "lucide-react";
import type { RouteDistance } from "@/types";

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
const STYLE_URL = "https://tiles.goong.io/assets/goong_map_web.json";

/** Decode a Goong/Google encoded polyline into [lng, lat] pairs (GeoJSON order). */
function decodePolyline(encoded: string, precision = 5): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: [number, number][] = [];
  const factor = Math.pow(10, precision);
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

function hasCoords(r: RouteDistance): boolean {
  return (
    r.originLat != null && r.originLng != null && r.destLat != null && r.destLng != null
  );
}

export function RouteMap({ route }: { route: RouteDistance }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPTILES_KEY || !container.current) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    (async () => {
      const goongjs = (await import("@goongmaps/goong-js")).default;
      if (cancelled || !container.current) return;
      goongjs.accessToken = MAPTILES_KEY;

      const line: [number, number][] = route.overviewPolyline
        ? decodePolyline(route.overviewPolyline)
        : hasCoords(route)
          ? [
              [route.originLng as number, route.originLat as number],
              [route.destLng as number, route.destLat as number],
            ]
          : [];

      const origin = hasCoords(route)
        ? ([route.originLng, route.originLat] as [number, number])
        : line[0];
      const dest = hasCoords(route)
        ? ([route.destLng, route.destLat] as [number, number])
        : line[line.length - 1];
      const center = line.length ? line[Math.floor(line.length / 2)] : [106.7, 10.78];

      map = new goongjs.Map({
        container: container.current,
        style: STYLE_URL,
        center,
        zoom: 12,
      });

      map.on("load", () => {
        if (cancelled) return;
        if (origin) new goongjs.Marker({ color: "#16a34a" }).setLngLat(origin).addTo(map);
        if (dest) new goongjs.Marker({ color: "#dc2626" }).setLngLat(dest).addTo(map);

        if (line.length >= 2) {
          map.addSource("route", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: line } },
          });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#16a34a", "line-width": 4 },
          });
          const bounds = line.reduce(
            (b: any, c: [number, number]) => b.extend(c), // eslint-disable-line @typescript-eslint/no-explicit-any
            new goongjs.LngLatBounds(line[0], line[0]),
          );
          map.fitBounds(bounds, { padding: 56, maxZoom: 15 });
        }
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [route]);

  // No maptiles key configured -> friendly placeholder.
  if (!MAPTILES_KEY) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[--color-border-subtle] bg-surface-soft text-center text-slate-400">
        <MapPin className="size-6" />
        <p className="text-sm font-medium text-slate-500">Map preview unavailable</p>
        <p className="max-w-xs text-xs">
          Set <code>NEXT_PUBLIC_GOONG_MAPTILES_KEY</code> to display the route on a
          Goong map.
        </p>
      </div>
    );
  }

  if (!route.overviewPolyline && !hasCoords(route)) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-[--color-border-subtle] bg-surface-soft text-sm text-slate-400">
        No route geometry for this trip.
      </div>
    );
  }

  return <div ref={container} className="h-[320px] w-full overflow-hidden rounded-xl" />;
}
