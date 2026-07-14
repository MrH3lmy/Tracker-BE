import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function renderAppAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
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

describe('primary navigation active state', () => {
  it('marks Notes (and only Notes) active when on /notes', () => {
    renderAppAt('/notes');
    const primaryNav = screen.getByRole('navigation', { name: 'Primary app navigation' });

    expect(within(primaryNav).getByRole('link', { name: 'Notes' })).toHaveAttribute('aria-current', 'page');
    expect(within(primaryNav).getByRole('link', { name: 'Calendar' })).not.toHaveAttribute('aria-current');
    expect(within(primaryNav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('marks Calendar (and only Calendar) active when on /calendar', () => {
    renderAppAt('/calendar');
    const primaryNav = screen.getByRole('navigation', { name: 'Primary app navigation' });

    expect(within(primaryNav).getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
    expect(within(primaryNav).getByRole('link', { name: 'Notes' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the mobile navigation in sync with the same route-derived active state', () => {
    renderAppAt('/notes');
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' });

    expect(within(mobileNav).getByRole('link', { name: 'Notes' })).toHaveAttribute('aria-current', 'page');
    expect(within(mobileNav).getByRole('link', { name: 'Calendar' })).not.toHaveAttribute('aria-current');
  });
});
