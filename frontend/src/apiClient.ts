export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiCallResult<T> {
  status: number;
  latencyMs: number;
  data: T;
  request: { method: HttpMethod; url: string; payload?: unknown };
  error?: string;
  rawBody?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

async function apiRequest<T>(method: HttpMethod, path: string, options?: { body?: BodyInit; contentType?: string; payload?: unknown; downloadFileName?: string; parseJson?: boolean }): Promise<ApiCallResult<T>> {
  const url = `${API_BASE_URL}${path}`;
  const startedAt = performance.now();
  const headers: Record<string, string> = {};
  if (options?.contentType) headers['Content-Type'] = options.contentType;

  const response = await fetch(url, { method, headers, body: options?.body });
  const latencyMs = Math.round(performance.now() - startedAt);
  const text = await response.text();

  if (options?.downloadFileName && response.ok) {
    const blob = new Blob([text], { type: response.headers.get('content-type') ?? 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = options.downloadFileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  let data: unknown = null;
  let error: string | undefined;
  if (options?.parseJson === false) {
    data = text;
  } else {
    try { data = text ? JSON.parse(text) : null; }
    catch (e) { data = text; error = `Failed to parse JSON: ${String(e)}`; }
  }

  return { status: response.status, latencyMs, data: data as T, request: { method, url, payload: options?.payload }, error, rawBody: text };
}

export async function apiJson<T>(method: HttpMethod, path: string, body?: unknown): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, { body: body === undefined ? undefined : JSON.stringify(body), contentType: 'application/json', payload: body });
}

export async function apiText<T>(method: HttpMethod, path: string, body?: string, contentType = 'text/plain'): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, { body, contentType, payload: body });
}

export async function apiDownload<T>(method: HttpMethod, path: string, fileName: string): Promise<ApiCallResult<T>> {
  return apiRequest<T>(method, path, { downloadFileName: fileName, parseJson: false });
}
