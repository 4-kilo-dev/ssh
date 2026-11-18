import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthToken, setSessionExpiredHandler, ApiError } from "@/api/client";
import { authApi, type AuthResult } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import type { Account } from "@/api/types";

/**
 * Keeps the signed-in account and its session token.
 * - The token lives in the phone's secure storage (Keychain / Keystore).
 * - On start it re-checks the session with /api/auth/me; if the phone is
 *   offline it keeps the last known account so the app still opens.
 * - A 401 on any request (expired/revoked session) signs the person out.
 */

const TOKEN_KEY = "addisvenue.token";
const ACCOUNT_KEY = "addisvenue.account";

interface AuthContextValue {
  ready: boolean;
  account: Account | null;
  signIn: (phone: string, password: string) => Promise<Account>;
  signUp: (name: string, phone: string, password: string) => Promise<Account>;
  activate: (token: string, password: string) => Promise<Account>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveSession(result: AuthResult) {
  setAuthToken(result.sessionToken);
  await SecureStore.setItemAsync(TOKEN_KEY, result.sessionToken);
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(result.account));
}

async function clearSession() {
  setAuthToken(null);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(ACCOUNT_KEY).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  const forgetSession = useCallback(async () => {
    await clearSession();
    queryClient.clear();
    setAccount(null);
  }, []);

  // Restore the session on app start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        setAuthToken(token);
        try {
          const fresh = await authApi.me();
          if (!cancelled) setAccount(fresh);
          await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(fresh));
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            await clearSession();
          } else {
            // Offline or server down: open with the last known account.
            const cached = await SecureStore.getItemAsync(ACCOUNT_KEY);
            if (cached && !cancelled) setAccount(JSON.parse(cached) as Account);
          }
        }
      } catch {
        // Secure storage unavailable — start signed out.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 with our token means the session ended on the server.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      forgetSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [forgetSession]);

  const finish = useCallback(async (result: AuthResult) => {
    // Drop personal data from any previous account; keep public data (venues,
    // availability) so a booking started as a guest can finish after sign-in.
    for (const key of ["bookings", "booking", "chats", "chat", "myVendors"]) {
      queryClient.removeQueries({ queryKey: [key] });
    }
    await saveSession(result);
    setAccount(result.account);
    queryClient.invalidateQueries();
    return result.account;
  }, []);

  const signIn = useCallback(
    async (phone: string, password: string) => finish(await authApi.login(phone, password)),
    [finish]
  );

  const signUp = useCallback(
    async (name: string, phone: string, password: string) =>
      finish(await authApi.register(name, phone, password)),
    [finish]
  );

  const activate = useCallback(
    async (token: string, password: string) => finish(await authApi.setPassword(token, password)),
    [finish]
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Sign out locally even if the server cannot be reached.
    }
    await forgetSession();
  }, [forgetSession]);

  const value = useMemo(
    () => ({ ready, account, signIn, signUp, activate, signOut }),
    [ready, account, signIn, signUp, activate, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
