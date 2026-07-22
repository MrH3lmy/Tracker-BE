export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiErrorMeta {
  code: 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'TIMEOUT_ERROR' | 'ABORT_ERROR';
  message: string;
  details?: string;
}

export type ApiCallOutcome = 'success' | 'network_error' | 'http_error' | 'parse_error';

export interface ApiCallResult<T> {
  status: number;
  latencyMs: number;
  data: T | null;
  request: { method: HttpMethod; url: string; payload?: unknown };
  outcome: ApiCallOutcome;
  ok: boolean;
  error?: ApiErrorMeta;
  rawBody?: string;
  contentType?: string;
}

export const isQueryError = (result?: ApiCallResult<unknown> | null): boolean => Boolean(result && !result.ok);

interface ApiRequestOptions {
  body?: BodyInit;
  contentType?: string;
  payload?: unknown;
  downloadFileName?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_HISTORY_LIMIT = 50;
const apiHistory: ApiCallResult<unknown>[] = [];
const apiHistoryListeners = new Set<() => void>();

// --- Auth token handling -----------------------------------------------
// Access token lives only in memory (module-level, not React state) since it
// is short-lived and must never touch localStorage. The refresh token is
// longer-lived and is persisted to localStorage so a session survives a
// page reload. `authContext.tsx` owns the React-facing state; this module
// just holds the tokens and lets interested parties (authContext) subscribe
// to "the stored session is no longer valid" via the same
// Set<() => void>-listener pattern used by apiHistoryListeners above.
const REFRESH_TOKEN_STORAGE_KEY = 'tracker.auth.refreshToken';
const AUTH_PATH_PREFIX = '/api/v1/auth/';

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshTokenResponseBody | null> | null = null;
const authFailureListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(nextAccessToken: string, nextRefreshToken: string): void {
  accessToken = nextAccessToken;
  try {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
  } catch {
    // Ignore storage failures (e.g. private browsing); the access token still
    // works in-memory for the rest of this page load.
  }
}

export function clearAuthTokens(): void {
  accessToken = null;
  try {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function onAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}

export function notifyAuthFailure(): void {
  authFailureListeners.forEach((listener) => listener());
}

// `user` is typed loosely here (not imported from authContext.ts) to avoid apiClient.ts, a
// low-level module, depending on app-level types; AuthProvider re-types it as AuthUser.
interface RefreshTokenResponseBody {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

// Performs the silent refresh with a plain fetch (not apiRequest) so it never recurses into the
// 401-retry logic below. Concurrent callers - whether triggered by a 401 interceptor or by
// AuthProvider's session-restore-on-load effect - share this single in-flight promise instead of
// each firing their own POST /auth/refresh with the same refresh token. That matters beyond
// avoiding wasted requests: the backend now consumes (revokes) a refresh token exactly once
// (see AuthService#refresh), so two independent refresh calls racing on the same stored token
// would make the loser fail with "Invalid or expired refresh token" even though nothing was
// actually wrong - every caller in this module MUST go through this shared promise rather than
// issuing its own POST /auth/refresh.
async function refreshAccessToken(): Promise<RefreshTokenResponseBody | null> {
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const normalizedBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const response = await fetch(`${normalizedBaseUrl}${AUTH_PATH_PREFIX}refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        if (!response.ok) return null;
        const body = (await response.json()) as RefreshTokenResponseBody;
        setAuthTokens(body.accessToken, body.refreshToken);
        return body;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

// Exposed so AuthProvider's session-restore-on-load effect shares the same in-flight refresh as
// the 401 interceptor below, instead of issuing an independent POST /auth/refresh with the same
// refresh token (see the comment on refreshAccessToken above).
export async function refreshSession(): Promise<RefreshTokenResponseBody | null> {
  return refreshAccessToken();
}

function recordApiCall<T>(result: ApiCallResult<T>): ApiCallResult<T> {
  apiHistory.unshift(result as ApiCallResult<unknown>);
  if (apiHistory.length > API_HISTORY_LIMIT) apiHistory.length = API_HISTORY_LIMIT;
  apiHistoryListeners.forEach((listener) => listener());
  return result;
}

export function getApiHistory(): ApiCallResult<unknown>[] {
  return [...apiHistory];
}

export function subscribeToApiHistory(listener: () => void): () => void {
  apiHistoryListeners.add(listener);
  return () => apiHistoryListeners.delete(listener);
}

export function clearApiHistory(): void {
  apiHistory.length = 0;
  apiHistoryListeners.forEach((listener) => listener());
}

function isJsonResponse(contentType: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return normalized.includes('application/json') || normalized.includes('+json');
}

async function readResponseBody(response: Response, downloadFileName?: string): Promise<{ data: unknown; rawBody?: string; parseError?: ApiErrorMeta; contentType?: string }> {
  const contentType = response.headers.get('content-type') ?? undefined;

  if (downloadFileName && response.ok) {
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = downloadFileName;
    link.click();
    URL.revokeObjectURL(link.href);

    return { data: null, contentType };
  }

  if (isJsonResponse(contentType ?? null)) {
    const text = await response.text();
    if (!text) return { data: null, rawBody: text, contentType };

    try {
      return { data: JSON.parse(text), rawBody: text, contentType };
    } catch (error) {
      return {
        data: null,
        rawBody: text,
        contentType,
        parseError: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse JSON response.',
          details: String(error),
        },
      };
    }
  }

  const text = await response.text();
  return { data: text, rawBody: text, contentType };
}

async function apiRequest<T>(method: HttpMethod, path: string, options?: ApiRequestOptions, isRetryAfterRefresh = false): Promise<ApiCallResult<T>> {
  const normalizedBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBaseUrl}${normalizedPath}`;
  const startedAt = performance.now();
  const headers: Record<string, string> = {};
  if (options?.contentType) headers['Content-Type'] = options.contentType;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const timeoutController = options?.timeoutMs ? new AbortController() : undefined;
  const requestController = new AbortController();
  const linkedSignals: AbortSignal[] = [requestController.signal];
  if (timeoutController) linkedSignals.push(timeoutController.signal);
  if (options?.signal) linkedSignals.push(options.signal);

  const mergedController = new AbortController();
  const onAbort = () => mergedController.abort();
  linkedSignals.forEach((signal) => {
    if (signal.aborted) mergedController.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });

  const timeoutId = options?.timeoutMs
    ? window.setTimeout(() => timeoutController?.abort(), options.timeoutMs)
    : undefined;

  try {
    const response = await fetch(url, { method, headers, body: options?.body, signal: mergedController.signal });
    const latencyMs = Math.round(performance.now() - startedAt);
    const { data, rawBody, parseError, contentType } = await readResponseBody(response, options?.downloadFileName);

    const baseResult: ApiCallResult<T> = {
      status: response.status,
      latencyMs,
      data: data as T | null,
      request: { method, url, payload: options?.payload },
      outcome: response.ok ? 'success' : 'http_error',
      ok: response.ok,
      rawBody,
      contentType,
    };

    if (!response.ok) {
      if (response.status === 401 && !isRetryAfterRefresh && !normalizedPath.startsWith(AUTH_PATH_PREFIX)) {
        const refreshed = await refreshAccessToken();
        if (refreshed !== null) {
          return apiRequest<T>(method, path, options, true);
        }
        clearAuthTokens();
        notifyAuthFailure();
      }

      return recordApiCall({
        ...baseResult,
        error: {
          code: 'HTTP_ERROR',
          message: `Request failed with status ${response.status}.`,
          details: rawBody ? rawBody.slice(0, 500) : undefined,
        },
      });
    }

    if (parseError) {
      return recordApiCall({
        ...baseResult,
        outcome: 'parse_error',
        ok: false,
        error: parseError,
      });
    }

    return recordApiCall(baseResult);
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    const isTimeoutAbort = Boolean(timeoutController?.signal.aborted);

    const networkErrorResult: ApiCallResult<T> = {
      status: 0,
      latencyMs,
      data: null,
      request: { method, url, payload: options?.payload },
      outcome: 'network_error',
      ok: false,
      error: {
        code: isAbort ? (isTimeoutAbort ? 'TIMEOUT_ERROR' : 'ABORT_ERROR') : 'NETWORK_ERROR',
        message: isAbort
          ? (isTimeoutAbort ? 'Request timed out.' : 'Request was aborted.')
          : 'Network request failed.',
        details: String(error),
      },
    };

    return recordApiCall(networkErrorResult);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    linkedSignals.forEach((signal) => signal.removeEventListener('abort', onAbort));
  }
}

export async function apiJson<T>(method: HttpMethod, path: string, body?: unknown, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    contentType: 'application/json',
    payload: body,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export async function apiText<T>(method: HttpMethod, path: string, body?: string, contentType = 'text/plain', options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, {
    body,
    contentType,
    payload: body,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export async function apiFormData<T>(method: HttpMethod, path: string, formData: FormData, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, {
    body: formData,
    payload: Object.fromEntries(formData.entries()),
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export async function apiDownload<T>(method: HttpMethod, path: string, fileName: string, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, {
    downloadFileName: fileName,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}
