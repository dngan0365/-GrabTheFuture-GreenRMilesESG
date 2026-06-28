"use client";

/**
 * Auth context — holds the current session, persists it to localStorage, and
 * delegates the actual login to the service layer (mock now, API in Step 2).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthSession, User } from "@/types";
import { api } from "@/lib/services";

const STORAGE_KEY = "greenmiles.session";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage on first client render. Syncing an external
  // store (localStorage) into React state is a valid effect use.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readStoredSession());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: AuthSession | null) => {
    setSession(next);
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await api.login({ email, password });
      persist(next);
      return next.user;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      persist(null);
    }
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      status: !hydrated
        ? "loading"
        : session
          ? "authenticated"
          : "unauthenticated",
      login,
      logout,
    }),
    [session, hydrated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
