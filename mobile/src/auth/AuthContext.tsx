import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  ApiError,
  login as apiLogin,
  refresh as apiRefresh,
  setRefreshHandler,
  type LoginResponse,
} from '../api/client';
import {
  clearSession,
  loadSession,
  saveSession,
  updateTokens,
  type StoredUser,
} from './tokenStorage';
import { canUseMobileApp } from './roles';

type AuthState = {
  ready: boolean;
  user: StoredUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthState | null>(null);

function toStoredUser(response: LoginResponse): StoredUser {
  return {
    userId: response.userId,
    email: response.email,
    fullName: response.fullName,
    roles: response.roles,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadSession();
      if (!cancelled && session) {
        if (!canUseMobileApp(session.user.roles)) {
          await clearSession();
        } else {
          setAccessToken(session.accessToken);
          setRefreshToken(session.refreshToken);
          setUser(session.user);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRefreshHandler(async (token) => {
      try {
        const response = await apiRefresh(token);
        if (!canUseMobileApp(response.roles)) {
          await clearSession();
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
          return null;
        }
        await updateTokens(response.accessToken, response.refreshToken);
        setAccessToken(response.accessToken);
        setRefreshToken(response.refreshToken);
        setUser(toStoredUser(response));
        return { accessToken: response.accessToken, refreshToken: response.refreshToken };
      } catch {
        await clearSession();
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        return null;
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email.trim(), password);
    const roles = response.roles ?? [];
    if (!canUseMobileApp(roles)) {
      throw new ApiError(
        'Bu uygulama üretici ve tarım uzmanı içindir. Yönetici web panelini kullanır.',
        403,
      );
    }
    const stored = toStoredUser(response);
    await saveSession(response.accessToken, response.refreshToken, stored);
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(stored);
    void import('../notifications/registerPush').then((m) =>
      m.registerForPushNotificationsAsync(response.accessToken),
    );
    void import('../offline/photoQueue').then((m) =>
      m.flushPhotoQueue(response.accessToken, response.refreshToken),
    );
  }, []);

  useEffect(() => {
    if (!accessToken || !user) return;
    void import('../notifications/registerPush').then((m) =>
      m.registerForPushNotificationsAsync(accessToken),
    );
    void import('../offline/photoQueue').then((m) =>
      m.flushPhotoQueue(accessToken, refreshToken),
    );
    const id = setInterval(() => {
      void import('../offline/photoQueue').then((m) =>
        m.flushPhotoQueue(accessToken, refreshToken),
      );
    }, 45_000);
    return () => clearInterval(id);
  }, [accessToken, refreshToken, user]);

  const signOut = useCallback(async () => {
    await clearSession();
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async <T,>(path: string, options: RequestInit = {}) =>
      api<T>(path, options, accessToken, refreshToken),
    [accessToken, refreshToken],
  );

  const value = useMemo(
    () => ({ ready, user, accessToken, refreshToken, signIn, signOut, authFetch }),
    [ready, user, accessToken, refreshToken, signIn, signOut, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
