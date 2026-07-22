import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiJson, clearAuthTokens, onAuthFailure, refreshSession, setAuthTokens, type ApiCallResult } from './apiClient';
import { AuthContext, type AuthActionResult, type AuthContextValue, type AuthUser } from './authContext';

interface AuthResponseBody {
  accessToken: string;
  user: AuthUser;
}

// A NETWORK_ERROR here means the fetch itself never got a response (e.g.
// ERR_CONNECTION_REFUSED) rather than the API rejecting the request, which
// almost always means the backend isn't reachable at all - a distinct,
// actionable condition worth a specific message instead of the generic
// "Network request failed."
function describeAuthError(result: ApiCallResult<AuthResponseBody>, fallback: string): string {
  if (result.error?.code === 'NETWORK_ERROR') {
    return "Can't reach the server. Make sure the backend is running and reachable, then try again.";
  }
  return result.error?.message ?? fallback;
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

  // On app load, try to silently turn the HttpOnly refresh-token cookie (if any) into a fresh
  // access token + user, so a page reload doesn't force a re-login. There's no way to check
  // client-side whether that cookie exists, so this always attempts it; if there's no valid
  // cookie, or the refresh fails, the user simply lands unauthenticated.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      // Goes through the same shared in-flight promise as the 401 interceptor in apiClient.ts
      // (rather than an independent POST /auth/refresh) so the two can't race on the same
      // refresh cookie - the backend now consumes a refresh token exactly once, so two
      // concurrent refresh calls on app load would make one of them fail spuriously.
      const result = await refreshSession();
      if (cancelled) return;

      if (result) {
        setUser(result.user as AuthUser);
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
      setAuthTokens(result.data.accessToken);
      setUser(result.data.user);
      return { ok: true };
    }
    return { ok: false, errorMessage: describeAuthError(result, 'Login failed.') };
  };

  const register = async (email: string, password: string, displayName?: string): Promise<AuthActionResult> => {
    const result = await apiJson<AuthResponseBody>('POST', '/api/v1/auth/register', {
      email,
      password,
      displayName: displayName?.trim() ? displayName.trim() : undefined,
      deviceLabel: currentDeviceLabel(),
    });
    if (result.ok && result.data) {
      setAuthTokens(result.data.accessToken);
      setUser(result.data.user);
      return { ok: true };
    }
    return { ok: false, errorMessage: describeAuthError(result, 'Registration failed.') };
  };

  const logout = async (): Promise<void> => {
    clearAuthTokens();
    setUser(null);
    // The refresh cookie (if any) travels automatically via credentials: 'include'; the backend
    // revokes it server-side and clears the cookie in its response.
    await apiJson('POST', '/api/v1/auth/logout');
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
