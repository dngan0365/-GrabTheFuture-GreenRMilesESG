"use client";

import { useEffect, useState } from "react";
import { Check, Coins, Gift, Lock, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CenteredSpinner,
  ErrorState,
  PageHeading,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { formatNumber, formatVnd } from "@/lib/format";

interface RedeemResult {
  voucherCode: string;
}

export default function RewardsPage() {
  const catalog = useAsync(() => api.getRewards(), []);
  const [points, setPoints] = useState<number | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Record<string, RedeemResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync the local balance once the catalog loads.
  useEffect(() => {
    if (catalog.data) setPoints(catalog.data.userPoints);
  }, [catalog.data]);

  async function handleRedeem(rewardId: string) {
    setRedeeming(rewardId);
    setErrors((prev) => ({ ...prev, [rewardId]: "" }));
    try {
      const { redemption, remainingGreenPoints } = await api.redeemReward(rewardId);
      setRedeemed((prev) => ({
        ...prev,
        [rewardId]: { voucherCode: redemption.voucherCode },
      }));
      setPoints(remainingGreenPoints);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [rewardId]: err instanceof Error ? err.message : "Redemption failed.",
      }));
    } finally {
      setRedeeming(null);
    }
  }

  if (catalog.loading) return <CenteredSpinner label="Loading rewards…" />;
  if (catalog.error || !catalog.data) return <ErrorState message={catalog.error} />;

  const balance = points ?? catalog.data.userPoints;

  return (
    <>
      <PageHeading
        eyebrow="Rewards"
        title="Redeem your green points"
        subtitle="Earned by choosing electric over petrol."
        icon={Gift}
        actions={
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-brand-dark">
            <Coins className="size-5" />
            <span className="font-bold">{formatNumber(balance)} pts</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.data.items.map((reward) => {
          const result = redeemed[reward.id];
          const error = errors[reward.id];
          const affordable = balance >= reward.requiredGreenPoints;
          return (
            <Card key={reward.id} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-green-100 text-brand-dark">
                    <Gift className="size-5" />
                  </span>
                  {reward.valueVnd > 0 && (
                    <Badge tone="neutral">{formatVnd(reward.valueVnd)}</Badge>
                  )}
                </div>
                <p className="mt-3 font-semibold text-slate-800">{reward.name}</p>
                <p className="mt-1 flex-1 text-sm text-slate-500">{reward.description}</p>

                {/* Success confirmation */}
                {result ? (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800">
                      <Check className="size-4" /> Redeemed!
                    </p>
                    {result.voucherCode ? (
                      <>
                        <p className="mt-1 font-mono text-sm font-bold tracking-wide text-brand-dark">
                          {result.voucherCode}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                          <Sparkles className="size-3.5" />
                          Added to your ride account — usable in Grab · Be · Xanh SM
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-green-700">
                        Recognition unlocked on your green profile.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      {formatNumber(reward.requiredGreenPoints)} pts
                    </span>
                    {affordable ? (
                      <Button
                        size="sm"
                        loading={redeeming === reward.id}
                        onClick={() => handleRedeem(reward.id)}
                      >
                        Redeem
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        <Lock className="size-3.5" /> Locked
                      </Button>
                    )}
                  </div>
                )}

                {error && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
