"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAccessToken } from "./api-client";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  /** True while the initial silent-refresh bootstrap is in flight. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch the current user (used after OAuth callback). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    }
  }, []);

  // On mount, try a silent refresh (using the httpOnly cookie); if a session
  // exists, hydrate the user so a page reload keeps you signed in.
  useEffect(() => {
    (async () => {
      if (await api.refresh()) {
        await loadUser();
      }
      setLoading(false);
    })();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api.login({ email, password });
      setAccessToken(accessToken);
      await loadUser();
    },
    [loadUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      // No auto sign-in: login is blocked until the email is verified (ADR-016).
      // The signup page shows a "check your email" screen after this resolves.
      await api.register({ name, email, password });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* best effort — clear local state regardless */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser: loadUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
