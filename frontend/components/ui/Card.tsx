import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[--color-border-subtle] bg-surface shadow-[--shadow-card]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[--color-border-subtle] px-5 py-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold text-slate-800", className)}>{children}</h3>
  );
}

export function CardDescription({
  className,
  children,
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500", className)}>{children}</p>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}
