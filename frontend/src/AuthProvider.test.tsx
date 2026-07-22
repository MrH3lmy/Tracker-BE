import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';
import { apiJson, clearAuthTokens } from './apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Consumer() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return <div>loading</div>;
  return <div>{isAuthenticated ? `signed in as ${user?.email}` : 'signed out'}</div>;
}

beforeEach(() => {
  clearAuthTokens();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearAuthTokens();
});

describe('AuthProvider session restoration', () => {
  it('does not race with a concurrent 401-triggered refresh from another component', async () => {
    let refreshCalls = 0;
    let resolveRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1;
        // Held open until both AuthProvider's restore effect and the simulated interceptor call
        // have had a chance to start, so the test proves they share one in-flight request rather
        // than happening to not overlap in this run.
        await refreshGate;
        return jsonResponse(200, {
          accessToken: 'new-access-token',
          user: { id: 1, email: 'racer@example.com', tier: 'FREE', role: 'USER' },
        });
      }
      const authHeader = (init?.headers as Record<string, string> | undefined)?.['Authorization'];
      if (authHeader === 'Bearer new-access-token') {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(401, { message: 'unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // Simulate another component firing an authenticated request at the same time as
    // AuthProvider's own session-restore-on-load effect - both would, before this fix, race to
    // independently call POST /auth/refresh with the same stored refresh token.
    const interceptorCall = apiJson('GET', '/api/v1/tasks');

    // Let both call sites reach their fetch() call before releasing the shared refresh.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    resolveRefresh?.();

    expect(await screen.findByText('signed in as racer@example.com')).toBeInTheDocument();
    await interceptorCall;

    expect(refreshCalls).toBe(1);
  });
});
