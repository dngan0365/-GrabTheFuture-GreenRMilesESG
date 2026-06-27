"use client";

import { useState } from "react";
import { Check, Coins, Gift, Lock } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CenteredSpinner,
  PageHeading,
} from "@/components/ui";
import { api } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import { formatNumber, formatVnd } from "@/lib/format";

export default function RewardsPage() {
  const catalog = useAsync(() => api.getRewards(), []);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Record<string, string>>({});

  async function handleRedeem(rewardId: string) {
    setRedeeming(rewardId);
    try {
      const { redemption } = await api.redeemReward(rewardId);
      setRedeemed((prev) => ({ ...prev, [rewardId]: redemption.voucherCode }));
    } finally {
      setRedeeming(null);
    }
  }

  if (catalog.loading || !catalog.data) {
    return <CenteredSpinner label="Loading rewards…" />;
  }

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
            <span className="font-bold">{formatNumber(catalog.data.userPoints)} pts</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.data.items.map((reward) => {
          const code = redeemed[reward.id];
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

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">
                    {formatNumber(reward.requiredGreenPoints)} pts
                  </span>
                  {code ? (
                    <Badge tone="success">
                      <Check className="size-3.5" /> {code}
                    </Badge>
                  ) : reward.eligible ? (
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
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
