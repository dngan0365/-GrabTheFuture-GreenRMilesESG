"use client";

import { Coins, Leaf, Mail, Medal, UserRound } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  PageHeading,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCo2, formatNumber, formatPercent } from "@/lib/format";

export default function ProfilePage() {
  const { user } = useAuth();
  const dash = useAsync(() => api.getEmployeeDashboard(), []);

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
            <CardTitle>Sustainability stats</CardTitle>
          </CardHeader>
          <CardBody>
            {dash.loading || !dash.data ? (
              <CenteredSpinner />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat icon={<Leaf className="size-5 text-green-600" />} label="CO₂ saved" value={formatCo2(dash.data.summary.savedEmissionKg)} />
                <Stat icon={<Coins className="size-5 text-sky-600" />} label="Green points" value={formatNumber(dash.data.summary.greenPoints)} />
                <Stat icon={<Medal className="size-5 text-amber-600" />} label="Rank" value={`#${dash.data.summary.rank}`} />
                <Stat label="EV rate" value={formatPercent(dash.data.tripStats.evRate)} />
                <Stat label="Total trips" value={formatNumber(dash.data.tripStats.totalTrips)} />
                <Stat label="Green score" value={formatNumber(dash.data.summary.greenScore)} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-surface-soft p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
