"use client";

import { Building2, Coins, Droplets, Gauge, Leaf, Mail, Medal, UserRound, Users } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  ErrorState,
  PageHeading,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCo2, formatLiters, formatNumber, formatPercent } from "@/lib/format";

interface StatTile {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "COMPANY_ADMIN";

  // Admins have no personal commuting data (their account logs no rides), so
  // show company-wide stats; employees see their own.
  const stats = useAsync<StatTile[]>(async () => {
    if (isAdmin) {
      const c = await api.getCompanyDashboard();
      const s = c.summary;
      return [
        { icon: <Leaf className="size-5 text-green-600" />, label: "Company CO₂ saved", value: formatCo2(s.savedEmissionKg) },
        { icon: <Gauge className="size-5 text-sky-600" />, label: "EV adoption", value: formatPercent(s.evRate) },
        { icon: <Users className="size-5 text-amber-600" />, label: "Employees", value: formatNumber(s.employees) },
        { icon: <Droplets className="size-5 text-green-600" />, label: "Fuel saved", value: formatLiters(s.fuelSavedLiters) },
        { label: "Total trips", value: formatNumber(s.totalTrips) },
        { label: "Trees equivalent", value: formatNumber(Math.round(s.treeEquivalent)) },
      ];
    }
    const e = await api.getEmployeeDashboard();
    return [
      { icon: <Leaf className="size-5 text-green-600" />, label: "CO₂ saved", value: formatCo2(e.summary.savedEmissionKg) },
      { icon: <Coins className="size-5 text-sky-600" />, label: "Green points", value: formatNumber(e.summary.greenPoints) },
      { icon: <Medal className="size-5 text-amber-600" />, label: "Rank", value: `#${e.summary.rank}` },
      { label: "EV rate", value: formatPercent(e.tripStats.evRate) },
      { label: "Total trips", value: formatNumber(e.tripStats.totalTrips) },
      { label: "Green score", value: formatNumber(e.summary.greenScore) },
    ];
  }, [isAdmin]);

  if (!user) return null;

  return (
    <>
      <PageHeading eyebrow="Account" title="Your profile" icon={UserRound} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="overflow-hidden">
          <div className="h-24 brand-gradient" />
          <CardBody className="-mt-12 flex flex-col items-center text-center">
            <Avatar name={user.name} size="lg" className="ring-4 ring-white" />
            <p className="mt-3 text-lg font-bold text-slate-900">{user.name}</p>
            <p className="flex items-center gap-1 text-sm text-slate-400">
              <Mail className="size-3.5" /> {user.email}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge tone="brand">{user.role.replace("_", " ")}</Badge>
              {user.department && <Badge tone="neutral">{user.department}</Badge>}
            </div>
            <p className="mt-3 text-sm text-slate-500">{user.companyName}</p>
          </CardBody>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAdmin ? <Building2 className="size-4 text-brand" /> : null}
              {isAdmin ? "Company sustainability" : "Your sustainability stats"}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {stats.loading ? (
              <CenteredSpinner />
            ) : stats.error || !stats.data ? (
              <ErrorState message={stats.error} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {stats.data.map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface-soft p-4">
                    <div className="flex items-center gap-2">
                      {s.icon}
                      <p className="text-xs font-medium text-slate-400">{s.label}</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <p className="mt-4 text-xs text-slate-400">
                Admin accounts don’t log personal trips, so this shows
                company-wide impact.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
