import { initials as toInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-8 text-xs rounded-lg",
  md: "size-10 text-sm rounded-xl",
  lg: "size-[78px] text-xl rounded-full",
} as const;

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center font-extrabold text-white brand-gradient",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {toInitials(name)}
    </span>
  );
}
