"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EmissionPoint, ForecastPoint } from "@/types";

const AXIS = { fontSize: 12, fill: "#94a3b8" };

const shortLabel = (label: string) => (label.length > 7 ? label.slice(5) : label);

/** Grouped bars comparing baseline vs actual vs saved CO₂ per period. */
export function EmissionBarChart({ data }: { data: EmissionPoint[] }) {
  const rows = data.map((d) => ({
    label: d.label.length > 7 ? d.label.slice(5) : d.label,
    actual: d.actualCo2Kg,
    saved: d.savedCo2Kg,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          cursor={{ fill: "rgba(22,163,74,0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e6edf5",
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="actual" name="Actual CO₂ (kg)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
        <Bar dataKey="saved" name="CO₂ saved (kg)" fill="#16a34a" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series saved-CO₂ bars (used on dashboards). */
export function SavedCo2Chart({ data }: { data: EmissionPoint[] }) {
  const rows = data.map((d) => ({
    label: d.label.length > 7 ? d.label.slice(5) : d.label,
    saved: d.savedCo2Kg,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          cursor={{ fill: "rgba(22,163,74,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e6edf5", fontSize: 13 }}
        />
        <Bar dataKey="saved" name="CO₂ saved (kg)" radius={[6, 6, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill="#16a34a" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}


/**
 * Daily CO₂ saved as a line chart: solid green for observed history, dashed
 * gray for the regression forecast. The two lines are bridged at the last
 * observed point so the dashed line visually continues the solid one.
 */
export function SavedCo2LineChart({
  history,
  forecast = [],
}: {
  history: EmissionPoint[];
  forecast?: ForecastPoint[];
}) {
  const data: { label: string; history: number | null; forecast: number | null }[] = [
    ...history.map((h) => ({
      label: shortLabel(h.label),
      history: h.savedCo2Kg,
      forecast: null as number | null,
    })),
    ...forecast.map((f) => ({
      label: shortLabel(f.label),
      history: null as number | null,
      forecast: f.savedCo2Kg,
    })),
  ];
  // Bridge: connect the dashed forecast to the end of the solid history.
  if (history.length && forecast.length) {
    data[history.length - 1].forecast = history[history.length - 1].savedCo2Kg;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e6edf5", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="history"
          name="CO₂ saved (kg)"
          stroke="#16a34a"
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast (kg)"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="6 5"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
