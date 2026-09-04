import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatrixPage } from './MatrixPage';

const MATRIX = {
  DO_NOW: [
    {
      id: 10,
      title: 'Renew the production TLS certificate',
      dueDate: '2026-09-03',
      status: 'NOT_STARTED',
      priorityScore: 94,
      priorityReason: 'Overdue and blocking two other tasks.',
      // Backend truth, carried through to this surface.
      blocked: true,
      ready: false,
    },
  ],
  SCHEDULE: [{ id: 12, title: 'Write the migration runbook', status: 'NOT_STARTED', blocked: false, ready: true }],
  DELEGATE: [],
  DELETE: [],
};

function mockFetch(payload: unknown = MATRIX) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      ),
    ),
  );
}

function renderMatrix() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tasks/matrix']}>
        <Routes>
          <Route path="/tasks/matrix" element={<MatrixPage />} />
          <Route path="/tasks/:id" element={<p>Task detail page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MatrixPage - loads on arrival', () => {
  it('renders quadrants without requiring a "Load matrix" press', async () => {
    mockFetch();
    renderMatrix();

    expect(await screen.findByRole('region', { name: /Do now/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Schedule/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load matrix/ })).toBeNull();
  });
});

describe('MatrixPage - tasks are navigable objects', () => {
  it('links each task to its detail route', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMatrix();

    const link = await screen.findByRole('link', { name: /Renew the production TLS certificate/ });
    expect(link).toHaveAttribute('href', '/tasks/10');

    await user.click(link);
    expect(await screen.findByText('Task detail page')).toBeInTheDocument();
  });
});

describe('MatrixPage - backend-authoritative readiness', () => {
  it('surfaces blocked and ready from the payload without inferring either', async () => {
    mockFetch();
    renderMatrix();

    const doNow = within(await screen.findByRole('region', { name: /Do now/ }));
    expect(doNow.getByText('Blocked')).toBeInTheDocument();
    expect(doNow.queryByText('Ready')).toBeNull();

    const schedule = within(screen.getByRole('region', { name: /Schedule/ }));
    expect(schedule.getByText('Ready')).toBeInTheDocument();
    expect(schedule.queryByText('Blocked')).toBeNull();
  });

  it('shows neither chip when the backend reports neither flag', async () => {
    mockFetch({ DO_NOW: [{ id: 1, title: 'Unflagged task' }], SCHEDULE: [], DELEGATE: [], DELETE: [] });
    renderMatrix();

    const doNow = within(await screen.findByRole('region', { name: /Do now/ }));
    expect(doNow.getByText('Unflagged task')).toBeInTheDocument();
    expect(doNow.queryByText('Blocked')).toBeNull();
    expect(doNow.queryByText('Ready')).toBeNull();
  });
});

describe('MatrixPage - unknown payloads', () => {
  it('keeps the raw response visible rather than dropping data', async () => {
    mockFetch({ somethingElse: [1, 2, 3] });
    renderMatrix();

    expect(await screen.findByText(/shape the UI does not recognise/)).toBeInTheDocument();
    expect(screen.getByText(/somethingElse/)).toBeInTheDocument();
  });
});
