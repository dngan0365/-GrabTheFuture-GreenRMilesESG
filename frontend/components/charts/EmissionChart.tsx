"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EmissionPoint } from "@/types";

const AXIS = { fontSize: 12, fill: "#94a3b8" };

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
