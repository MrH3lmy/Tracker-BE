import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiJson, clearAuthTokens, getRefreshToken, onAuthFailure, setAuthTokens } from './apiClient';

export type UserTier = 'FREE' | 'PREMIUM';
export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: number | string;
  email: string;
  displayName?: string | null;
  tier: UserTier;
  role: UserRole;
}

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthActionResult {
  ok: boolean;
  errorMessage?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string, displayName?: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const notReady = async (): Promise<AuthActionResult> => ({ ok: false, errorMessage: 'Authentication is not ready yet.' });

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: notReady,
  register: notReady,
  logout: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

// Free-text hint the backend stores for the "active sessions" list; not
// required, so failures to read navigator.userAgent are fine to swallow.
function currentDeviceLabel(): string | undefined {
  try {
    return typeof navigator === 'undefined' ? undefined : navigator.userAgent;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load, try to silently turn a stored (long-lived) refresh token
  // into a fresh access token + user, so a page reload doesn't force a
  // re-login. If there's no stored refresh token, or the refresh fails,
  // the user simply lands unauthenticated.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const storedRefreshToken = getRefreshToken();
      if (!storedRefreshToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const result = await apiJson<AuthResponseBody>('POST', '/api/v1/auth/refresh', { refreshToken: storedRefreshToken });
      if (cancelled) return;

      if (result.ok && result.data) {
        setAuthTokens(result.data.accessToken, result.data.refreshToken);
        setUser(result.data.user);
      } else {
        clearAuthTokens();
        setUser(null);
      }
      setIsLoading(false);
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // apiClient.ts calls this after a failed silent refresh (e.g. the refresh
  // token itself expired or was revoked from another device). Clear local
  // state so route guarding redirects to /login.
  useEffect(() => onAuthFailure(() => {
    clearAuthTokens();
    setUser(null);
  }), []);

  const login = async (email: string, password: string): Promise<AuthActionResult> => {
    const result = await apiJson<AuthResponseBody>('POST', '/api/v1/auth/login', {
      email,
      password,
      deviceLabel: currentDeviceLabel(),
    });
    if (result.ok && result.data) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
      return { ok: true };
    }
    return { ok: false, errorMessage: result.error?.message ?? 'Login failed.' };
  };

  const register = async (email: string, password: string, displayName?: string): Promise<AuthActionResult> => {
    const result = await apiJson<AuthResponseBody>('POST', '/api/v1/auth/register', {
      email,
      password,
      displayName: displayName?.trim() ? displayName.trim() : undefined,
      deviceLabel: currentDeviceLabel(),
    });
    if (result.ok && result.data) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
      return { ok: true };
    }
    return { ok: false, errorMessage: result.error?.message ?? 'Registration failed.' };
  };

  const logout = async (): Promise<void> => {
    const storedRefreshToken = getRefreshToken();
    clearAuthTokens();
    setUser(null);
    if (storedRefreshToken) {
      await apiJson('POST', '/api/v1/auth/logout', { refreshToken: storedRefreshToken });
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- login/register/logout are redefined each render but only close over stable setState setters.
  [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
