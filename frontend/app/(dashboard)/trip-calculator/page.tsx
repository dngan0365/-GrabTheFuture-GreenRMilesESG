"use client";

import { useState } from "react";
import { CheckCircle2, Leaf, MapPin, Route, Zap } from "lucide-react";
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
import { formatCo2, formatVnd } from "@/lib/format";
import type {
  CompareOption,
  TripPurpose,
  VehicleClass,
  VehicleProfileId,
} from "@/types";

const CLASSES: { value: VehicleClass; label: string }[] = [
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "CAR_4", label: "4-seat Car" },
  { value: "SUV_7", label: "7-seat / SUV" },
];

export default function TripCalculatorPage() {
  const [origin, setOrigin] = useState("District 1, HCMC");
  const [destination, setDestination] = useState("Thu Duc, HCMC");
  const [distance, setDistance] = useState(12.3);
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>("MOTORBIKE");
  const [purpose, setPurpose] = useState<TripPurpose>("COMMUTE");

  const [options, setOptions] = useState<CompareOption[] | null>(null);
  const [selected, setSelected] = useState<VehicleProfileId | null>(null);
  const [comparing, setComparing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ co2SavedKg: number; points: number } | null>(null);

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    setComparing(true);
    setBooked(null);
    setSelected(null);
    try {
      const result = await api.compareVehicles(distance, vehicleClass);
      setOptions(result);
      setSelected(result.find((o) => o.recommended)?.vehicleProfileId ?? null);
    } finally {
      setComparing(false);
    }
  }

  async function handleBook() {
    if (!selected) return;
    setBooking(true);
    try {
      const { carbon } = await api.bookRide({
        originName: origin,
        destinationName: destination,
        distanceKm: distance,
        vehicleProfileId: selected,
        purpose,
        priceVnd: Math.round(distance * 7500),
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
        subtitle="Compare petrol vs electric before you book — see the carbon you'll save."
        icon={Route}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Plan a trip</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCompare} className="space-y-4">
              <Field label="From" htmlFor="origin">
                <Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
              </Field>
              <Field label="To" htmlFor="destination">
                <Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Distance (km)" htmlFor="distance">
                  <Input
                    id="distance"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label="Vehicle class" htmlFor="class">
                  <Select
                    id="class"
                    value={vehicleClass}
                    onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                  >
                    {CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Purpose" htmlFor="purpose">
                <Select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as TripPurpose)}>
                  <option value="COMMUTE">Commute</option>
                  <option value="BUSINESS">Business</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Button type="submit" fullWidth loading={comparing}>
                Compare options
              </Button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50/60 p-3 text-xs text-slate-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              The backend owns all carbon math — these numbers match your ESG report exactly.
            </div>
          </CardBody>
        </Card>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {!options && !comparing && (
            <Card>
              <CardBody className="py-16 text-center text-slate-400">
                Enter a trip and compare to see CO₂ savings per vehicle.
              </CardBody>
            </Card>
          )}

          {comparing && (
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

          {options && selected && (
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
                    Estimated fare {formatVnd(Math.round(distance * 7500))}
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
