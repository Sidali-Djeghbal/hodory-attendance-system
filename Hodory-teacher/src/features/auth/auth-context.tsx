'use client';

import * as React from 'react';
import { clearStoredAuth, readStoredAuth, type StoredUser, writeStoredAuth } from './auth-storage';

type AuthState = {
  ready: boolean;
  token: string | null;
  user: StoredUser | null;
  login: (next: { token: string; user: StoredUser }) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<StoredUser | null>(null);

  React.useEffect(() => {
    const stored = readStoredAuth();
    setToken(stored.token);
    setUser(stored.user);
    setReady(true);
  }, []);

  const login = React.useCallback((next: { token: string; user: StoredUser }) => {
    setToken(next.token);
    setUser(next.user);
    writeStoredAuth(next);
  }, []);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ ready, token, user, login, logout }),
    [ready, token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}

