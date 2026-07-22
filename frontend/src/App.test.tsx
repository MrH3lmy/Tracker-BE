import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const AUTH_USER = { id: 1, email: 'test@example.com', displayName: 'Test User', tier: 'FREE', role: 'USER' };

async function renderAppAt(path: string) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/v1/auth/refresh')) {
      return Promise.resolve(new Response(JSON.stringify({ accessToken: 'stub-access-token', user: AUTH_USER }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return Promise.reject(new Error('network disabled in tests'));
  }));

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitForElementToBeRemoved(() => screen.queryByText('Restoring your session...'));
  return result;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('primary navigation active state', () => {
  it('marks Notes (and only Notes) active when on /notes', async () => {
    await renderAppAt('/notes');
    const primaryNav = screen.getByRole('navigation', { name: 'Primary app navigation' });

    expect(within(primaryNav).getByRole('link', { name: 'Notes' })).toHaveAttribute('aria-current', 'page');
    expect(within(primaryNav).getByRole('link', { name: 'Calendar' })).not.toHaveAttribute('aria-current');
    expect(within(primaryNav).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('marks Calendar (and only Calendar) active when on /calendar', async () => {
    await renderAppAt('/calendar');
    const primaryNav = screen.getByRole('navigation', { name: 'Primary app navigation' });

    expect(within(primaryNav).getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
    expect(within(primaryNav).getByRole('link', { name: 'Notes' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the mobile navigation in sync with the same route-derived active state', async () => {
    await renderAppAt('/notes');
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' });

    expect(within(mobileNav).getByRole('link', { name: 'Notes' })).toHaveAttribute('aria-current', 'page');
    expect(within(mobileNav).getByRole('link', { name: 'Calendar' })).not.toHaveAttribute('aria-current');
  });

  it('exposes a mobile bottom navigation with Today, Tasks, and Habits', async () => {
    await renderAppAt('/notes');
    const bottomNav = screen.getByRole('navigation', { name: 'Mobile primary navigation' });

    expect(within(bottomNav).getByRole('link', { name: 'Today' })).toBeInTheDocument();
    expect(within(bottomNav).getByRole('link', { name: 'Tasks' })).toBeInTheDocument();
    expect(within(bottomNav).getByRole('link', { name: 'Habits' })).toBeInTheDocument();
  });
});
