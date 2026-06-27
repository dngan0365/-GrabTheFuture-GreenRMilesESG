"use client";

import {
  Bike,
  Coins,
  Leaf,
  Medal,
  Sparkles,
  TreePine,
} from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  PageHeading,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  statusTone,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import {
  formatCo2,
  formatKm,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export function EmployeeDashboardView({ name }: { name: string }) {
  const dash = useAsync(() => api.getEmployeeDashboard(), []);
  const rides = useAsync(() => api.getRideHistory(), []);
  const rec = useAsync(() => api.getRecommendation("employee", "en"), []);

  if (dash.loading || !dash.data) return <CenteredSpinner label="Loading dashboard…" />;

  const { summary, tripStats } = dash.data;

  return (
    <>
      <PageHeading
        eyebrow="Employee"
        title={`Hi, ${name.split(" ").slice(-1)[0]} 👋`}
        subtitle="Your commuting carbon impact this month."
        icon={Leaf}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="CO₂ saved this month" value={formatCo2(summary.savedEmissionKg)} icon={Leaf} tone="success" deltaPercent={12} />
        <StatCard index={1} label="Green points" value={formatNumber(summary.greenPoints)} icon={Coins} tone="primary" hint={`Green score ${summary.greenScore}`} />
        <StatCard index={2} label="Leaderboard rank" value={`#${summary.rank}`} icon={Medal} tone="warning" />
        <StatCard index={3} label="EV trip rate" value={formatPercent(tripStats.evRate)} icon={Bike} tone="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trip stats + recent rides */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>This month at a glance</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Mini label="Total trips" value={formatNumber(tripStats.totalTrips)} />
              <Mini label="EV trips" value={formatNumber(tripStats.evTrips)} />
              <Mini label="Distance" value={formatKm(tripStats.totalDistanceKm)} />
              <Mini label="Fuel saved" value={`${summary.fuelSavedLiters.toFixed(1)} L`} />
              <Mini label="Baseline CO₂" value={formatCo2(summary.monthBaselineEmissionKg)} />
              <Mini label="Actual CO₂" value={formatCo2(summary.monthEmissionKg)} />
              <Mini label="Trees equiv." value={`${summary.treeEquivalent.toFixed(2)}`} icon={<TreePine className="size-4 text-green-600" />} />
              <Mini label="Today CO₂" value={formatCo2(summary.todayEmissionKg)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent trips</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <TH>Route</TH>
                <TH>Vehicle</TH>
                <TH>Distance</TH>
                <TH>CO₂ saved</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {(rides.data ?? []).map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <p className="font-medium text-slate-800">{r.originName}</p>
                      <p className="text-xs text-slate-400">→ {r.destinationName}</p>
                    </TD>
                    <TD>{r.vehicleDisplayName}</TD>
                    <TD>{formatKm(r.distanceKm)}</TD>
                    <TD>
                      <span className={r.co2SavedKg ? "font-bold text-green-700" : "text-slate-400"}>
                        {formatCo2(r.co2SavedKg ?? 0)}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>

        {/* AI recommendation */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" /> AI suggestions
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
                <p className="mt-4 rounded-xl border border-green-100 bg-green-50/60 p-3 text-sm font-medium text-brand-dark">
                  {rec.data.nextBestAction}
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Mini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-3">
      <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
