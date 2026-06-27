import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "brand";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-green-100 text-green-800",
  info: "bg-sky-100 text-sky-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  brand: "bg-green-100 text-brand-dark",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Maps a ride/trip status string to a badge tone. */
export function statusTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "VERIFIED":
      return "success";
    case "BOOKED":
    case "EMITTED":
      return "info";
    case "CANCELLED":
    case "REVIEW":
      return "danger";
    default:
      return "neutral";
  }
}
