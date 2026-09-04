import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailPage } from './TaskDetailPage';
import { AnnouncementContext } from '../announcementContext';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const BLOCKED_TASK = {
  id: 5,
  title: 'Implement frontend checkout',
  status: 'NOT_STARTED',
  blocked: true,
  ready: false,
  blockers: [
    { id: 10, title: 'Implement checkout API', status: 'IN_PROGRESS' },
    { id: 11, title: 'Finalize payment contract', status: 'NOT_STARTED' },
  ],
};

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/tasks/5/detail')) {
      return jsonResponse({ task: BLOCKED_TASK, notes: [], screenshots: [], linkedNotes: [] });
    }
    if (url.includes('/api/v1/projects')) return jsonResponse([]);
    if (url.includes('/api/v1/tasks')) return jsonResponse([]);
    return jsonResponse([]);
  }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementContext.Provider value={{ message: '', announce: () => {} }}>
        <MemoryRouter initialEntries={['/tasks/5']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/tasks/10" element={<p>Task 10 detail page</p>} />
          </Routes>
        </MemoryRouter>
      </AnnouncementContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TaskDetailPage - readiness and blocker navigation', () => {
  it('shows the blocked readiness state with an expanded list of blockers, and navigates to a blocker on click', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Implement checkout API')).toBeInTheDocument();
    expect(screen.getByText('Finalize payment contract')).toBeInTheDocument();

    // Readiness is stated as its own region, in words rather than a colour.
    const readiness = screen.getByRole('region', { name: 'Readiness' });
    expect(within(readiness).getByText(/Blocked/)).toBeInTheDocument();
    expect(within(readiness).getByText(/waiting on work that is not finished/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Implement checkout API/ }));

    expect(await screen.findByText('Task 10 detail page')).toBeInTheDocument();
  });
});
