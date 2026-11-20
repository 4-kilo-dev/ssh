"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

export interface SessionAccount {
  id: string;
  name: string;
  phone: string;
  role: "super_admin" | "venue_manager" | "vendor" | "user" | string;
  telegramId?: string | null;
}

type SessionStatus = "checking" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  account: SessionAccount | null;
  status: SessionStatus;
  /** Re-validate the session against the server (e.g. after login or logout). */
  refresh: () => Promise<void>;
  /** Apply an account returned by a successful sign-in before revalidating it. */
  adopt: (account: SessionAccount) => void;
  /** Clear the cached session locally without a network round-trip. */
  clear: () => void;
}

interface MeResponse {
  status: string;
  account?: SessionAccount | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Fetches `/api/auth/me` once on mount and shares the result across the web
 * tree. Previously `AppShell` and `PageRouter` each re-fetched the session on
 * every route change; consumers now read from this context and only trigger a
 * network call through `refresh()` after an explicit auth change.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [status, setStatus] = useState<SessionStatus>("checking");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await apiGet<MeResponse>("/api/auth/me", { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (data?.status === "authenticated" && data.account) {
        setAccount(data.account);
        setStatus("authenticated");
      } else {
        setAccount(null);
        setStatus("unauthenticated");
      }
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === "AbortError") return;
      // A 401 (unauthenticated) throws ApiError; treat any failure as signed-out.
      setAccount(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const clear = useCallback(() => {
    setAccount(null);
    setStatus("unauthenticated");
  }, []);

  const adopt = useCallback((nextAccount: SessionAccount) => {
    setAccount(nextAccount);
    setStatus("authenticated");
  }, []);

  return (
    <SessionContext.Provider value={{ account, status, refresh: load, adopt, clear }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
