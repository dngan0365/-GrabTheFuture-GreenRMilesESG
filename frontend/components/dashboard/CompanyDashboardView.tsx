"use client";

import {
  Building2,
  Droplets,
  Gauge,
  Leaf,
  TrendingUp,
  TreePine,
  Users,
} from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  ErrorState,
  PageHeading,
  StatCard,
} from "@/components/ui";
import { SavedCo2LineChart } from "@/components/charts/EmissionChart";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import {
  formatCo2,
  formatLiters,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export function CompanyDashboardView({ companyName }: { companyName: string }) {
  const dash = useAsync(() => api.getCompanyDashboard(), []);
  const series = useAsync(() => api.getEmissionAnalytics("day"), []);
  const prediction = useAsync(() => api.getMonthlyPrediction(), []);

  if (dash.loading) return <CenteredSpinner label="Loading dashboard…" />;
  if (dash.error || !dash.data) return <ErrorState message={dash.error} />;
  const s = dash.data.summary;

  return (
    <>
      <PageHeading
        eyebrow="Company"
        title={`${companyName} — Scope 3 mobility`}
        subtitle="Company-wide commuting emissions and reduction progress."
        icon={Building2}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="CO₂ saved" value={formatCo2(s.savedEmissionKg)} icon={Leaf} tone="success" deltaPercent={18} />
        <StatCard index={1} label="EV adoption" value={formatPercent(s.evRate)} icon={Gauge} tone="primary" />
        <StatCard index={2} label="Employees" value={formatNumber(s.employees)} icon={Users} tone="warning" />
        <StatCard index={3} label="Fuel saved" value={formatLiters(s.fuelSavedLiters)} icon={Droplets} tone="success" hint="Petrol avoided vs baseline" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily CO₂ saved — history & forecast</CardTitle>
          </CardHeader>
          <CardBody>
            {series.loading ? (
              <CenteredSpinner />
            ) : series.error || !series.data ? (
              <ErrorState message={series.error} />
            ) : (
              <SavedCo2LineChart
                history={series.data.items}
                forecast={series.data.forecast}
              />
            )}
          </CardBody>
        </Card>

        {/* Month-end prediction */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-brand" /> Month-end forecast
            </CardTitle>
          </CardHeader>
          <CardBody>
            {prediction.loading ? (
              <CenteredSpinner />
            ) : prediction.error || !prediction.data ? (
              <ErrorState message={prediction.error} />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Predicted emissions</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCo2(prediction.data.prediction.predictedEmissionKg)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Target</span>
                  <span className="font-semibold">
                    {formatCo2(prediction.data.status.targetEmissionKg)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <Badge tone={prediction.data.status.riskLevel === "AT_RISK" ? "danger" : "success"}>
                    {prediction.data.status.riskLevel.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-semibold">
                    {formatPercent(prediction.data.prediction.confidence * 100, 0)}
                  </span>
                </div>
                <p className="rounded-lg bg-surface-soft p-2 text-xs text-slate-400">
                  Model: {prediction.data.model.modelType}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top departments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top departments by CO₂ saved</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {dash.data.topDepartments.map((d) => {
            const max = dash.data!.topDepartments[0].savedEmissionKg;
            const pct = Math.round((d.savedEmissionKg / max) * 100);
            return (
              <div key={d.department}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{d.department}</span>
                  <span className="text-slate-500">
                    {formatCo2(d.savedEmissionKg)} · {formatPercent(d.evRate)} EV
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full brand-gradient-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
            <TreePine className="size-4 text-green-600" />
            Equivalent to {formatNumber(Math.round(s.treeEquivalent))} trees absorbing CO₂ for a year.
          </div>
        </CardBody>
      </Card>
    </>
  );
}
