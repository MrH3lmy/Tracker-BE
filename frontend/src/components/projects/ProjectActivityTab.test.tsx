import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectActivityTab } from './ProjectActivityTab';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function renderTab(fetchImpl: (url: string) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => fetchImpl(String(input))));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectActivityTab projectId={7} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectActivityTab', () => {
  it('shows a loading state while the first page is in flight', () => {
    renderTab(() => new Promise(() => {}));
    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('shows an empty state teaching what produces activity', async () => {
    renderTab(() => jsonResponse([]));
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.getByText(/create tasks, complete them, and add notes/)).toBeInTheDocument();
  });

  it('renders a successful timeline grouped by day with a navigable task entity', async () => {
    renderTab(() => jsonResponse([
      {
        id: 1,
        projectId: 7,
        eventType: 'TASK_COMPLETED',
        entityType: 'TASK',
        entityId: 42,
        summary: 'Implement OAuth callback',
        metadata: { durationMinutes: 30 },
        occurredAt: new Date().toISOString(),
      },
    ]));

    expect(await screen.findByText('Implement OAuth callback')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open task' })).toHaveAttribute('href', '/tasks/42');
  });

  it('shows an error state with retry when the request fails', async () => {
    renderTab(() => Promise.reject(new Error('network down')));
    expect(await screen.findByText("Couldn't load activity")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
