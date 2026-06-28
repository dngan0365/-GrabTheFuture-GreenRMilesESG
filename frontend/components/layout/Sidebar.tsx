"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { navItemsForRole } from "@/config/nav";
import { useAuth } from "@/lib/auth/auth-context";
import { Brand } from "./Brand";

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = navItemsForRole(user?.role);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[--color-border-subtle] bg-surface",
          "transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Brand />
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-green-50 text-brand-dark"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon className={cn("size-5", active && "text-brand")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Reduce at the source
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Every verified EV trip becomes auditable Scope 3 reduction data.
          </p>
        </div>
      </aside>
    </>
  );
}
