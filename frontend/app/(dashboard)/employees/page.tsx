"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
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
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { formatCo2, formatNumber, formatPercent } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import type { LeaderboardMetric } from "@/types";

const METRICS: { value: LeaderboardMetric; label: string }[] = [
  { value: "savedCo2Kg", label: "CO₂ saved" },
  { value: "greenPoints", label: "Green points" },
  { value: "evRate", label: "EV rate" },
  { value: "evTrips", label: "EV trips" },
];

const RANK_TONE = ["", "🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>("savedCo2Kg");
  const board = useAsync(() => api.getLeaderboard(metric), [metric]);

  return (
    <>
      <PageHeading
        eyebrow="Community"
        title="Green Leaderboard"
        subtitle="Top sustainable commuters this month."
        icon={Trophy}
        actions={
          <Select value={metric} onChange={(e) => setMetric(e.target.value as LeaderboardMetric)} className="w-44">
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        }
      />

      <Card>
        {board.loading || !board.data ? (
          <CenteredSpinner label="Ranking commuters…" />
        ) : (
          <Table>
            <THead>
              <TH>Rank</TH>
              <TH>Employee</TH>
              <TH>Department</TH>
              <TH>CO₂ saved</TH>
              <TH>Green points</TH>
              <TH>EV rate</TH>
            </THead>
            <TBody>
              {board.data.items.map((e) => {
                const isMe = e.userId === user?.id;
                return (
                  <TR key={e.userId} className={isMe ? "bg-green-50/60" : undefined}>
                    <TD>
                      <span className="font-bold text-slate-700">
                        {RANK_TONE[e.rank] ?? `#${e.rank}`}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} size="sm" />
                        <span className="font-medium text-slate-800">
                          {e.name}
                          {isMe && <Badge tone="brand" className="ml-2">You</Badge>}
                        </span>
                      </div>
                    </TD>
                    <TD>{e.department ?? "—"}</TD>
                    <TD className="font-bold text-green-700">{formatCo2(e.savedCo2Kg)}</TD>
                    <TD>{formatNumber(e.greenPoints)}</TD>
                    <TD>{formatPercent(e.evRate)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
