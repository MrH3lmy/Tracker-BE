import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiJson, clearAuthTokens } from './apiClient';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient task pagination compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthTokens();
  });

  it('combines every task page when an existing caller requests the collection without page parameters', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ id: index + 1 }));
    const secondPage = [{ id: 501 }, { id: 502 }];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('page=0')) return jsonResponse(firstPage);
      if (url.includes('page=1')) return jsonResponse(secondPage);
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiJson<Array<{ id: number }>>('GET', '/api/v1/tasks');

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(502);
    expect(result.data?.[0].id).toBe(1);
    expect(result.data?.[501].id).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('page=0&size=500');
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=1&size=500');
  });

  it('keeps explicit pagination as a single bounded request for new clients', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: 21 }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiJson<Array<{ id: number }>>('GET', '/api/v1/tasks?page=2&size=10');

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([{ id: 21 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('also preserves complete archive lists', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: 1 }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiJson<Array<{ id: number }>>('GET', '/api/v1/tasks/archive');

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/tasks/archive?page=0&size=500');
  });
});
