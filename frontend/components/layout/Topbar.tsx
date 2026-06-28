"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/lib/auth/auth-context";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[--color-border-subtle] bg-surface/80 px-4 backdrop-blur lg:px-6">
      <button
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden flex-col lg:flex">
        <p className="text-sm text-slate-400">
          Welcome back{user ? "," : ""}
        </p>
        <p className="-mt-0.5 font-semibold text-slate-800">
          {user?.name ?? "Guest"}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {user?.companyName && (
          <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:inline">
            {user.companyName}
          </span>
        )}
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name ?? "Guest"} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl border border-[--color-border-subtle] bg-surface p-1.5 shadow-lg"
              role="menu"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <hr className="my-1 border-[--color-border-subtle]" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                role="menuitem"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
