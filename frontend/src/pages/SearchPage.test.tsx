import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from './SearchPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in tests')));
});

afterEach(() => {
  vi.unstubAllGlobals();
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
});
