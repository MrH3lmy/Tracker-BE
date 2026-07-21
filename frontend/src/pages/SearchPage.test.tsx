import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from './SearchPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tasks/:id" element={<p>Task detail page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in tests')));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('SearchPage', () => {
  it('shows a prompt instead of searching before any query is typed', () => {
    renderPage();
    expect(screen.getByText(/Start typing to search/)).toBeInTheDocument();
  });

  it('explains the supported filter syntax', () => {
    renderPage();
    expect(screen.getByText(/type:task, type:note, type:habit, type:tag/)).toBeInTheDocument();
  });

  it('runs a search once text is typed and surfaces an error if the request fails', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Search'), 'invoice');

    expect(await screen.findByText(/Request failed|error/i)).toBeInTheDocument();
  });

  it('treats a filter-only query (no free text) as a real search too', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Search'), 'status:blocked');

    expect(screen.queryByText(/Start typing to search/)).not.toBeInTheDocument();
  });

  it('supports arrow-key roving through results and Enter to open the selected one', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      items: [
        { type: 'TASK', id: 1, title: 'Ship release', url: '/tasks/1' },
        { type: 'NOTE', id: 2, title: 'Release notes', url: '/tasks/2' },
      ],
      page: 0,
      size: 20,
      totalElements: 2,
    }), { status: 200, headers: { 'content-type': 'application/json' } }))));

    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText('Search');
    await user.type(input, 'release');

    const firstOption = await screen.findByRole('option', { name: /Ship release/ });
    expect(firstOption).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /Release notes/ })).toHaveAttribute('aria-selected', 'true');
    expect(firstOption).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(await screen.findByText('Task detail page')).toBeInTheDocument();
  });

  it('shows recently viewed items as the empty state once something has been visited', () => {
    localStorage.setItem('tracker.search.recentItems', JSON.stringify([
      { type: 'TASK', id: 5, title: 'Recently viewed task', url: '/tasks/5', viewedAt: Date.now() },
    ]));

    renderPage();

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recently viewed task/ })).toBeInTheDocument();
    expect(screen.queryByText(/Start typing to search/)).not.toBeInTheDocument();
  });

  it('navigates to a recent item when it is clicked', async () => {
    localStorage.setItem('tracker.search.recentItems', JSON.stringify([
      { type: 'TASK', id: 5, title: 'Recently viewed task', url: '/tasks/5', viewedAt: Date.now() },
    ]));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Recently viewed task/ }));

    expect(await screen.findByText('Task detail page')).toBeInTheDocument();
  });
});
