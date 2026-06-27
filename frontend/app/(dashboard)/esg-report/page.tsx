"use client";

import { Download, FileText, Leaf } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  ErrorState,
  PageHeading,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { formatCo2, formatKm, formatNumber, formatPercent } from "@/lib/format";

export default function EsgReportPage() {
  const report = useAsync(() => api.getEsgReport(), []);

  function handleExport() {
    if (!report.data) return;
    const blob = new Blob([JSON.stringify(report.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scope3-mobility-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (report.loading) {
    return <CenteredSpinner label="Generating ESG report…" />;
  }
  if (report.error || !report.data) {
    return <ErrorState message={report.error} />;
  }

  const { summary, methodology, vehicleProfiles, period } = report.data;

  const KPIS = [
    { label: "Total trips", value: formatNumber(summary.totalTrips) },
    { label: "EV adoption", value: formatPercent(summary.evRate) },
    { label: "Distance", value: formatKm(summary.totalDistanceKm) },
    { label: "Baseline CO₂", value: formatCo2(summary.baselineEmissionKg) },
    { label: "Actual CO₂", value: formatCo2(summary.actualEmissionKg) },
    { label: "CO₂ saved", value: formatCo2(summary.savedEmissionKg) },
    { label: "Fuel saved", value: `${formatNumber(summary.fuelSavedLiters)} L` },
    { label: "Trees equiv.", value: formatNumber(Math.round(summary.treeEquivalent)) },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Reporting"
        title="Scope 3 Mobility Report"
        subtitle={`Period ${period.from} → ${period.to}`}
        icon={FileText}
        actions={
          <Button onClick={handleExport}>
            <Download className="size-4" /> Export JSON
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-[--color-border-subtle] bg-surface p-4 shadow-[--shadow-card]">
            <p className="text-xs font-medium text-slate-400">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Methodology</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row k="Runtime formula" v={methodology.runtimeFormula} mono />
            <Row k="Saved formula" v={methodology.savedFormula} mono />
            <Row k="Baseline logic" v={methodology.baselineLogic} />
            <Row k="Grid factor" v={methodology.gridEmissionFactor} />
            <div>
              <p className="font-medium text-slate-500">Sources</p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {methodology.sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="size-4 text-brand" /> Vehicle carbon factors
            </CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <TH>Profile</TH>
              <TH>Energy use</TH>
              <TH>kg CO₂ / km</TH>
            </THead>
            <TBody>
              {vehicleProfiles.map((v) => (
                <TR key={v.vehicleProfileId}>
                  <TD className="font-medium text-slate-800">{v.vehicleProfileId}</TD>
                  <TD>{v.energyUsage}</TD>
                  <TD>{v.co2KgPerKm}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-medium text-slate-500">{k}</p>
      <p className={mono ? "font-mono text-xs text-slate-700" : "text-slate-700"}>{v}</p>
    </div>
  );
}
