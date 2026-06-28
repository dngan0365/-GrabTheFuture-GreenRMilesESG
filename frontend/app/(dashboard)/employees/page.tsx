"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  CenteredSpinner,
  ErrorState,
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
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";

// The backend leaderboard exposes greenPoints + greenScore (not per-user CO₂),
// so we rank on those and sort client-side.
type SortKey = "greenPoints" | "greenScore";

const RANK_BADGE = ["", "🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>("greenPoints");
  const board = useAsync(() => api.getLeaderboard(), []);

  const ranked = useMemo(() => {
    const items = board.data?.items ?? [];
    return [...items]
      .sort((a, b) => b[sortKey] - a[sortKey])
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [board.data, sortKey]);

  return (
    <>
      <PageHeading
        eyebrow="Community"
        title="Green Leaderboard"
        subtitle="Top sustainable commuters this month."
        icon={Trophy}
        actions={
          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="w-44"
          >
            <option value="greenPoints">Green points</option>
            <option value="greenScore">Green score</option>
          </Select>
        }
      />

      <Card>
        {board.loading ? (
          <CenteredSpinner label="Ranking commuters…" />
        ) : board.error ? (
          <ErrorState message={board.error} />
        ) : (
          <Table>
            <THead>
              <TH>Rank</TH>
              <TH>Employee</TH>
              <TH>Green points</TH>
              <TH>Green score</TH>
            </THead>
            <TBody>
              {ranked.map((e) => {
                const isMe = e.userId === user?.id;
                return (
                  <TR key={e.userId} className={isMe ? "bg-green-50/60" : undefined}>
                    <TD>
                      <span className="font-bold text-slate-700">
                        {RANK_BADGE[e.rank] ?? `#${e.rank}`}
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
                    <TD className="font-bold text-green-700">
                      {formatNumber(e.greenPoints)}
                    </TD>
                    <TD>{formatNumber(e.greenScore)}</TD>
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
