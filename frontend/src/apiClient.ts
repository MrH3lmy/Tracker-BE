export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiCallResult<T> {
  status: number;
  latencyMs: number;
  data: T;
  request: {
    method: HttpMethod;
    url: string;
    payload?: unknown;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export async function apiJson<T>(method: HttpMethod, path: string, body?: unknown): Promise<ApiCallResult<T>> {
  const url = `${API_BASE_URL}${path}`;
  const startedAt = performance.now();

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const latencyMs = Math.round(performance.now() - startedAt);
  const data = (await response.json()) as T;

  return {
    status: response.status,
    latencyMs,
    data,
    request: {
      method,
      url,
      payload: body
    }
  };
}
