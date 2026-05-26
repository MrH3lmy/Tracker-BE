export type JsonMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JsonRequestOptions {
  method?: JsonMethod;
  path: string;
  body?: unknown;
}

export interface ApiRequestRecord {
  method: JsonMethod;
  url: string;
  payload: unknown;
}

export interface ApiResponseRecord<TJson = unknown> {
  status: number;
  ok: boolean;
  latencyMs: number;
  json: TJson | null;
}

export interface ApiExchange<TJson = unknown> {
  request: ApiRequestRecord;
  response: ApiResponseRecord<TJson>;
  error?: string;
}

const fallbackBaseUrl = "http://localhost:8080";

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl
).replace(/\/+$/, "");

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

function parseJson(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function jsonRequest<TJson = unknown>({
  method = "GET",
  path,
  body
}: JsonRequestOptions): Promise<ApiExchange<TJson>> {
  const url = apiUrl(path);
  const startedAt = performance.now();
  const request: ApiRequestRecord = {
    method,
    url,
    payload: body ?? null
  };

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const text = await response.text();
    const json = parseJson(text) as TJson | null;

    return {
      request,
      response: {
        status: response.status,
        ok: response.ok,
        latencyMs,
        json
      },
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      request,
      response: {
        status: 0,
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        json: null
      },
      error: error instanceof Error ? error.message : "Unknown network error"
    };
  }
}
