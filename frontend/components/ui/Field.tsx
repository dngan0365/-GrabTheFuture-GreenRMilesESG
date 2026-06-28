import { cn } from "@/lib/cn";

const FIELD =
  "h-11 w-full rounded-xl border border-[--color-border-subtle] bg-surface px-3.5 text-sm text-slate-800 " +
  "placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 " +
  "disabled:opacity-60";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "pr-9", className)} {...props}>
      {children}
    </select>
  );
}
