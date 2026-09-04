import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardPage } from './BoardPage';
import { AnnouncementContext } from '../announcementContext';
import { UndoToastContext } from '../undoToastContext';

const COLUMNS = [
  { id: 1, name: 'To do', status: 'NOT_STARTED', position: 0 },
  { id: 2, name: 'In progress', status: 'IN_PROGRESS', position: 1 },
  { id: 3, name: 'Done', status: 'DONE', position: 2 },
];

const TASKS = [
  {
    id: 10,
    title: 'Renew the production TLS certificate before the October audit',
    boardColumnId: 1,
    position: 0,
    status: 'NOT_STARTED',
    priorityScore: 88,
    // Backend truth: blocked and ready are independent axes.
    blocked: true,
    ready: false,
    blockers: [{ id: 11, title: 'Get finance approval', status: 'IN_PROGRESS' }],
  },
  {
    id: 12,
    title: 'Write the migration runbook',
    boardColumnId: 2,
    position: 0,
    status: 'IN_PROGRESS',
    blocked: false,
    ready: true,
  },
];

const moveCalls: { url: string; body: unknown }[] = [];

function mockFetch() {
  moveCalls.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (data: unknown) =>
        Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));

      if (url.includes('/board-columns')) return json(COLUMNS);
      if (init?.method === 'PATCH' && /\/tasks\/\d+\/move/.test(url)) {
        moveCalls.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return json({});
      }
      if (url.includes('/tasks')) return json(TASKS);
      return Promise.reject(new Error(`unmocked: ${url}`));
    }),
  );
}

/** Desktop by default; pass false to exercise the single-column mobile board. */
function setViewport(multiColumn: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('768') ? multiColumn : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function renderBoard({ multiColumn = true } = {}) {
  mockFetch();
  setViewport(multiColumn);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementContext.Provider value={{ message: '', announce: () => {} }}>
        <UndoToastContext.Provider value={{ showUndo: () => {} }}>
          <MemoryRouter initialEntries={['/tasks/board']}>
            <Routes>
              <Route path="/tasks/board" element={<BoardPage />} />
              <Route path="/tasks/:id" element={<p>Task detail page</p>} />
            </Routes>
          </MemoryRouter>
        </UndoToastContext.Provider>
      </AnnouncementContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BoardPage - movement without dragging (WCAG 2.2 AA, dragging-alternative)', () => {
  it('offers every task a pointer- and keyboard-operable move control', async () => {
    renderBoard();

    const moveButton = await screen.findByRole('button', { name: /Move "Renew the production TLS certificate/ });
    expect(moveButton).toBeInTheDocument();
  });

  it('moves a task to a chosen column through the menu, with no drag involved', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /Move "Renew the production TLS certificate/ }));
    await user.click(await screen.findByRole('menuitem', { name: /In progress/ }));

    await waitFor(() => expect(moveCalls).toHaveLength(1));
    expect(moveCalls[0].url).toContain('/tasks/10/move');
    // Appended to the end of the destination column, which already holds one task.
    expect(moveCalls[0].body).toEqual({ boardColumnId: 2, position: 1 });
  });

  it('names the task\'s current column in the menu and does not offer it as a destination', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /Move "Renew the production TLS certificate/ }));

    const current = await screen.findByRole('menuitem', { name: /To do/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps the drag handle as a separate control from the card, not the whole card', async () => {
    renderBoard();

    // The handle names itself and points at the menu alternative.
    const handle = await screen.findByRole('button', { name: /Drag Renew the production TLS certificate/ });
    expect(handle).toBeInTheDocument();
    // The title stays an ordinary link, not swallowed by drag listeners.
    expect(screen.getByRole('link', { name: /Renew the production TLS certificate/ })).toHaveAttribute(
      'href',
      '/tasks/10',
    );
  });
});

describe('BoardPage - backend-authoritative readiness', () => {
  it('shows blocked and ready from the backend flags, never inferred from each other', async () => {
    renderBoard();

    const blockedCard = within(await screen.findByRole('article', { name: /Renew the production TLS certificate/ }));
    expect(blockedCard.getByText('Blocked')).toBeInTheDocument();
    // A blocked task never shows a Ready chip.
    expect(blockedCard.queryByText('Ready')).toBeNull();

    // ready:true with blocked:false is not surfaced as a chip in list context --
    // silence is the common case -- but the blocked chip's explanation is.
    expect(blockedCard.getByText(/Waiting for 1 task/)).toBeInTheDocument();
  });
});

describe('BoardPage - titles stay legible', () => {
  it('renders the full task title rather than clipping it to a single line', async () => {
    renderBoard();

    const title = await screen.findByTitle('Renew the production TLS certificate before the October audit');
    expect(title).toHaveTextContent('Renew the production TLS certificate before the October audit');
  });
});

describe('BoardPage - mobile shows one column at a time', () => {
  it('replaces the column rail with a switcher and renders a single column', async () => {
    const user = userEvent.setup();
    renderBoard({ multiColumn: false });

    const switcher = await screen.findByRole('navigation', { name: 'Board column' });
    expect(within(switcher).getByRole('button', { name: /To do/ })).toHaveAttribute('aria-current', 'true');

    // Only the selected column's region is present.
    expect(screen.getByRole('region', { name: /To do column/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /In progress column/ })).toBeNull();

    await user.click(within(switcher).getByRole('button', { name: /In progress/ }));

    expect(await screen.findByRole('region', { name: /In progress column/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /To do column/ })).toBeNull();
  });
});
