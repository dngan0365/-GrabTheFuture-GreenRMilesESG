"use client";

import { useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  PageHeading,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { EmissionBarChart } from "@/components/charts/EmissionChart";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { formatCo2, formatNumber, formatPercent } from "@/lib/format";
import type { AnalyticsGroupBy } from "@/types";

const GROUPS: { value: AnalyticsGroupBy; label: string }[] = [
  { value: "day", label: "By day" },
  { value: "department", label: "By department" },
];

export default function AnalyticsPage() {
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("day");
  const analytics = useAsync(() => api.getEmissionAnalytics(groupBy), [groupBy]);
  const rec = useAsync(() => api.getRecommendation("company", "en"), []);

  return (
    <>
      <PageHeading
        eyebrow="Admin"
        title="Emission Analytics"
        subtitle="Track commuting emissions and reduction trends over time."
        icon={BarChart3}
        actions={
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as AnalyticsGroupBy)} className="w-44">
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </Select>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Actual vs saved CO₂</CardTitle>
        </CardHeader>
        <CardBody>
          {analytics.loading || !analytics.data ? (
            <CenteredSpinner />
          ) : (
            <EmissionBarChart data={analytics.data.items} />
          )}
        </CardBody>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
          </CardHeader>
          {analytics.data && (
            <Table>
              <THead>
                <TH>{groupBy === "department" ? "Department" : "Date"}</TH>
                <TH>Trips</TH>
                <TH>EV rate</TH>
                <TH>Actual</TH>
                <TH>Saved</TH>
              </THead>
              <TBody>
                {analytics.data.items.map((p) => (
                  <TR key={p.label}>
                    <TD className="font-medium text-slate-800">{p.label}</TD>
                    <TD>{formatNumber(p.totalTrips)}</TD>
                    <TD>{formatPercent(p.evRate)}</TD>
                    <TD>{formatCo2(p.actualCo2Kg)}</TD>
                    <TD className="font-bold text-green-700">{formatCo2(p.savedCo2Kg)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" /> Company insights
            </CardTitle>
          </CardHeader>
          <CardBody>
            {rec.loading || !rec.data ? (
              <CenteredSpinner />
            ) : (
              <>
                <p className="text-sm text-slate-600">{rec.data.summary}</p>
                <ul className="mt-4 space-y-3">
                  {rec.data.recommendations.map((item, i) => (
                    <li key={i} className="rounded-xl bg-surface-soft p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        {item.estimatedCo2ReductionKg > 0 && (
                          <Badge tone="success">−{item.estimatedCo2ReductionKg} kg</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
