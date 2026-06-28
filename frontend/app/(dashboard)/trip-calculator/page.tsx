"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Leaf, MapPin, Navigation, Route, Zap } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeading,
  Select,
  Spinner,
} from "@/components/ui";
import { api } from "@/lib/services";
import { RouteMap } from "@/components/maps/RouteMap";
import { PlaceAutocomplete } from "@/components/forms/PlaceAutocomplete";
import { formatCo2, formatVnd } from "@/lib/format";
import type {
  CompareOption,
  RouteDistance,
  TripPurpose,
  VehicleClass,
  VehicleProfileId,
} from "@/types";

const CLASSES: { value: VehicleClass; label: string }[] = [
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "CAR_4", label: "4-seat Car" },
  { value: "SUV_7", label: "7-seat / SUV" },
];

// Goong travel mode hint based on vehicle class.
const goongVehicle = (vc: VehicleClass) => (vc === "MOTORBIKE" ? "bike" : "car");

export default function TripCalculatorPage() {
  const [origin, setOrigin] = useState("District 1, HCMC");
  const [destination, setDestination] = useState("Thu Duc, HCMC");
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>("MOTORBIKE");
  const [purpose, setPurpose] = useState<TripPurpose>("COMMUTE");

  const [route, setRoute] = useState<RouteDistance | null>(null);
  const [options, setOptions] = useState<CompareOption[] | null>(null);
  const [selected, setSelected] = useState<VehicleProfileId | null>(null);

  // Manual fallback when the distance provider (Goong) is not configured.
  const [manualMode, setManualMode] = useState(false);
  const [manualDistance, setManualDistance] = useState(12.3);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ co2SavedKg: number; points: number } | null>(null);

  function reset() {
    setBooked(null);
    setSelected(null);
    setNotice(null);
  }

  async function runCompare(distanceKm: number) {
    const result = await api.compareVehicles(distanceKm, vehicleClass);
    setOptions(result);
    setSelected(result.find((o) => o.recommended)?.vehicleProfileId ?? null);
  }

  // Primary flow: Origin + Destination -> distance -> compare.
  async function handleCalculateRoute(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const r = await api.getDistance(origin, destination, goongVehicle(vehicleClass));
      setRoute(r);
      await runCompare(r.distanceKm);
    } catch {
      // Provider not configured (or unreachable) -> let the user enter distance.
      setRoute(null);
      setManualMode(true);
      setNotice(
        "Route distance lookup isn't available (set GOONG_API_KEY on the backend). Enter the distance manually to continue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleManualCompare(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      setRoute({
        originName: origin,
        destinationName: destination,
        distanceKm: manualDistance,
        provider: "manual",
      });
      await runCompare(manualDistance);
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    if (!selected || !route) return;
    setBooking(true);
    try {
      const { carbon } = await api.bookRide({
        originName: origin,
        destinationName: destination,
        distanceKm: route.distanceKm,
        vehicleProfileId: selected,
        purpose,
        priceVnd: Math.round(route.distanceKm * 7500),
      });
      setBooked({
        co2SavedKg: carbon.co2SavedKg,
        points: Math.round(carbon.co2SavedKg * 100),
      });
    } finally {
      setBooking(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Trip"
        title="Trip Calculator"
        subtitle="Enter origin and destination — we calculate the route distance and compare petrol vs electric."
        icon={Route}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Plan a trip</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCalculateRoute} className="space-y-4">
              <PlaceAutocomplete
                id="origin"
                label="From (origin)"
                value={origin}
                onChange={setOrigin}
                placeholder="Search a pickup location…"
              />
              <PlaceAutocomplete
                id="destination"
                label="To (destination)"
                value={destination}
                onChange={setDestination}
                placeholder="Search a destination…"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Vehicle class" htmlFor="class">
                  <Select id="class" value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}>
                    {CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Purpose" htmlFor="purpose">
                  <Select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as TripPurpose)}>
                    <option value="COMMUTE">Commute</option>
                    <option value="BUSINESS">Business</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
              </div>
              <Button type="submit" fullWidth loading={loading && !manualMode}>
                <Navigation className="size-4" /> Calculate route & compare
              </Button>
            </form>

            {/* Manual fallback */}
            {manualMode && (
              <form onSubmit={handleManualCompare} className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <Field label="Distance (km)" htmlFor="manual-distance">
                  <Input
                    id="manual-distance"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={manualDistance}
                    onChange={(e) => setManualDistance(Number(e.target.value))}
                    required
                  />
                </Field>
                <Button type="submit" variant="outline" fullWidth loading={loading}>
                  Compare with this distance
                </Button>
              </form>
            )}

            {notice && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {notice}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {/* Route summary */}
          {route && (
            <Card>
              <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <p className="text-xs text-slate-400">Route</p>
                  <p className="font-semibold text-slate-800">
                    {route.originName} → {route.destinationName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Distance</p>
                  <p className="text-lg font-bold text-slate-900">{route.distanceKm} km</p>
                </div>
                {route.durationMinutes != null && (
                  <div>
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="flex items-center gap-1 font-semibold text-slate-700">
                      <Clock className="size-4" /> {route.durationMinutes} min
                    </p>
                  </div>
                )}
                {route.provider && (
                  <Badge tone="neutral" className="ml-auto">
                    {route.provider}
                  </Badge>
                )}
              </CardBody>
            </Card>
          )}

          {/* Goong map with the predicted route */}
          {route && (
            <Card>
              <CardBody className="p-2">
                <RouteMap route={route} />
              </CardBody>
            </Card>
          )}

          {!options && !loading && (
            <Card>
              <CardBody className="py-16 text-center text-slate-400">
                Enter origin and destination, then calculate to compare CO₂ savings.
              </CardBody>
            </Card>
          )}

          {loading && (
            <Card>
              <CardBody className="flex justify-center py-16">
                <Spinner />
              </CardBody>
            </Card>
          )}

          {options?.map((o) => {
            const isEv = o.recommended;
            const active = selected === o.vehicleProfileId;
            return (
              <button
                key={o.vehicleProfileId}
                onClick={() => setSelected(o.vehicleProfileId)}
                className={`w-full rounded-2xl border bg-surface p-5 text-left transition ${
                  active ? "border-brand ring-4 ring-brand/15" : "border-[--color-border-subtle] hover:border-brand/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 place-items-center rounded-xl ${isEv ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {isEv ? <Zap className="size-5" /> : <Leaf className="size-5" />}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{o.displayName}</p>
                      <p className="text-xs text-slate-400">Actual {formatCo2(o.actualCo2Kg)} CO₂</p>
                    </div>
                  </div>
                  {isEv && <Badge tone="success">Recommended</Badge>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Metric label="CO₂ saved" value={formatCo2(o.co2SavedKg)} highlight />
                  <Metric label="Fuel saved" value={`${o.fuelSavedLiters.toFixed(2)} L`} />
                  <Metric label="Trees" value={o.treeEquivalent.toFixed(3)} />
                </div>
              </button>
            );
          })}

          {options && selected && route && (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                {booked ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="size-5" />
                    <span className="font-semibold">
                      Booked! Saved {formatCo2(booked.co2SavedKg)} · +{booked.points} green points
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Estimated fare {formatVnd(Math.round(route.distanceKm * 7500))}
                  </p>
                )}
                <Button onClick={handleBook} loading={booking} disabled={!!booked}>
                  {booked ? "Trip booked" : "Book this trip"}
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-3">
      <p className={`text-lg font-bold ${highlight ? "text-green-700" : "text-slate-800"}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
