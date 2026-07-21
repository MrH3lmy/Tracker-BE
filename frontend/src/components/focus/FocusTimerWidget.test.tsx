import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocusTimerWidget } from './FocusTimerWidget';

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FocusTimerWidget />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FocusTimerWidget', () => {
  it('renders nothing when there is no active focus session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    renderWidget();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('status', { name: /active focus session/i })).not.toBeInTheDocument();
  });

  it('shows the running session, elapsed time, and controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 1,
      taskId: 5,
      taskTitle: 'Design homepage',
      startedAt: new Date().toISOString(),
      status: 'RUNNING',
      elapsedMinutes: 12,
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    renderWidget();

    expect(await screen.findByText('Design homepage')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('shows Resume for a paused session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 1,
      taskId: null,
      taskTitle: null,
      startedAt: new Date().toISOString(),
      status: 'PAUSED',
      elapsedMinutes: 5,
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    renderWidget();

    expect(await screen.findByText('Focus session')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });
});
