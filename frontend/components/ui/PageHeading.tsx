import type { LucideIcon } from "lucide-react";

export function PageHeading({
  title,
  subtitle,
  icon: Icon,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {Icon && (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white brand-gradient">
            <Icon className="size-6" />
          </span>
        )}
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
