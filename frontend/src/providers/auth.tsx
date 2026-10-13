import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, SESSION_EXPIRED, tokens } from "../lib/api";
import type { User } from "../lib/types";

interface AuthContextValue {
  user: User | undefined;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(tokens.refresh));

  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.auth.me,
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  });

  const logout = useCallback(() => {
    tokens.clear();
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED, logout);
    return () => window.removeEventListener(SESSION_EXPIRED, logout);
  }, [logout]);

  useEffect(() => {
    if (me.isError) logout();
  }, [me.isError, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.auth.login(email, password);
      const user = await api.auth.me();
      queryClient.setQueryData(["me"], user);
      setHasToken(true);
    },
    [queryClient],
  );

  const status = !hasToken ? "anonymous" : me.data ? "authenticated" : "loading";

  const value = useMemo(() => ({ user: me.data, status, login, logout }) as AuthContextValue, [me.data, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
