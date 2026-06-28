import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTone = "success" | "primary" | "warning" | "danger";

const ICON_TONES: Record<StatTone, string> = {
  success: "bg-green-100 text-green-700",
  primary: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Signed delta in %, rendered with an up/down arrow. */
  deltaPercent?: number;
  hint?: string;
  /** Stagger index for the entrance animation. */
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "success",
  deltaPercent,
  hint,
  index = 0,
}: StatCardProps) {
  const positive = (deltaPercent ?? 0) >= 0;
  return (
    <div
      className="animate-fade-up rounded-2xl border border-[--color-border-subtle] bg-surface p-5 shadow-[--shadow-card]"
      style={{ ["--delay" as string]: `${index * 70}ms` }}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-xl",
            ICON_TONES[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        {deltaPercent !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-semibold",
              positive ? "text-green-600" : "text-red-600",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowDownRight className="size-4" />
            )}
            {Math.abs(deltaPercent)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
