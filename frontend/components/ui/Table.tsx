import { cn } from "@/lib/cn";

export function Table({
  className,
  children,
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="border-b border-[--color-border-subtle]">
      <tr className="text-left">{children}</tr>
    </thead>
  );
}

export function TH({
  className,
  children,
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className="divide-y divide-[--color-border-subtle]">{children}</tbody>
  );
}

export function TR({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-slate-50/70", className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle text-slate-700", className)} {...props}>
      {children}
    </td>
  );
}
