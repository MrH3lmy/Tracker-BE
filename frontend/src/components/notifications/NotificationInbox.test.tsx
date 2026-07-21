import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationInbox } from './NotificationInbox';

function renderInbox() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationInbox />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NotificationInbox', () => {
  it('shows an unread-count badge on the bell button', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve(new Response(JSON.stringify({ count: 2 }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify([
        { id: 1, title: 'Task due today', body: 'Write report', link: '/tasks/1', read: false, createdDate: new Date().toISOString() },
      ]), { status: 200, headers: { 'content-type': 'application/json' } }));
    }));

    renderInbox();

    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications, 2 unread/i })).toBeInTheDocument();
  });

  it('shows a caught-up message when there are no notifications', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve(new Response(JSON.stringify({ count: 0 }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));
    }));

    renderInbox();

    await screen.findByRole('button', { name: 'Notifications' });
    const trigger = screen.getByRole('button', { name: 'Notifications' });
    trigger.click();

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });
});
