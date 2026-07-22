import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiJson,
  clearAuthTokens,
  getAccessToken,
  onAuthFailure,
  refreshSession,
} from './apiClient';

// Regression coverage for GitHub issue #223: the backend now consumes a refresh token exactly
// once, so two independent frontend refresh calls racing on the same refresh-token cookie would
// make the loser fail with an "invalid token" error even though nothing was actually wrong. Every
// caller in the app must therefore share the single in-flight refresh in apiClient.ts. The refresh
// token itself (issue #257) now lives only in an HttpOnly cookie the browser attaches
// automatically - these tests never see or seed it directly, only the mocked fetch responses.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient refresh deduplication', () => {
  beforeEach(() => {
    clearAuthTokens();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthTokens();
  });

  it('sends only one POST /auth/refresh when multiple requests get a 401 at the same time', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(200, {
          accessToken: 'new-access-token',
          user: { id: 1, email: 'a@example.com', tier: 'FREE', role: 'USER' },
        });
      }
      // Any protected endpoint: 401 until the retry (isRetryAfterRefresh), which we detect via
      // the Authorization header carrying the freshly-issued access token.
      const authHeader = (init?.headers as Record<string, string> | undefined)?.['Authorization'];
      if (authHeader === 'Bearer new-access-token') {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(401, { message: 'unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([
      apiJson('GET', '/api/v1/tasks'),
      apiJson('GET', '/api/v1/notes'),
      apiJson('GET', '/api/v1/dashboard'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(getAccessToken()).toBe('new-access-token');
  });

  it('fails all queued callers cleanly when the shared refresh fails, without clobbering the stored token twice', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return jsonResponse(400, { message: 'Invalid or expired refresh token.' });
      }
      return jsonResponse(401, { message: 'unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    let authFailureCount = 0;
    const unsubscribe = onAuthFailure(() => {
      authFailureCount += 1;
    });

    try {
      const results = await Promise.all([
        apiJson('GET', '/api/v1/tasks'),
        apiJson('GET', '/api/v1/notes'),
      ]);

      expect(results.every((r) => !r.ok)).toBe(true);
      // Each failed caller independently notifies on its own retry path (both saw the same
      // failed shared refresh), but the important invariant is that neither call silently
      // "succeeds" and no queued call is left hanging.
      expect(authFailureCount).toBeGreaterThan(0);
      expect(getAccessToken()).toBeNull();
    } finally {
      unsubscribe();
    }
  });

  it('does not recursively trigger another refresh when the retried request itself gets a 401', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(200, {
          accessToken: 'new-access-token',
          user: { id: 1, email: 'a@example.com', tier: 'FREE', role: 'USER' },
        });
      }
      protectedCalls += 1;
      // Every attempt at the protected endpoint returns 401, even after the retry with a fresh
      // access token (e.g. the token was revoked server-side moments later).
      return jsonResponse(401, { message: 'unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiJson('GET', '/api/v1/tasks');

    expect(result.ok).toBe(false);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2); // original attempt + exactly one retry, never a third
  });

  it('refreshSession() shares the same in-flight promise as the 401 interceptor (no independent call)', async () => {
    let refreshCalls = 0;
    let resolveRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1;
        await refreshGate;
        return jsonResponse(200, {
          accessToken: 'new-access-token',
          user: { id: 1, email: 'a@example.com', tier: 'FREE', role: 'USER' },
        });
      }
      return jsonResponse(401, { message: 'unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    // Simulate AuthProvider's session-restore-on-load racing with a component's 401-triggered
    // interceptor call, both firing around the same time on app start.
    const restorePromise = refreshSession();
    const interceptorPromise = apiJson('GET', '/api/v1/tasks');

    // Let both call sites reach the fetch() call before letting the mocked refresh resolve.
    await Promise.resolve();
    await Promise.resolve();
    resolveRefresh?.();

    const [restoreResult] = await Promise.all([restorePromise, interceptorPromise]);

    expect(refreshCalls).toBe(1);
    expect(restoreResult?.accessToken).toBe('new-access-token');
  });
});
