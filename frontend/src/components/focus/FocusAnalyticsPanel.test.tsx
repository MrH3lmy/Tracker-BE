import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocusAnalyticsPanel } from './FocusAnalyticsPanel';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FocusAnalyticsPanel />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FocusAnalyticsPanel', () => {
  it('shows an empty-state prompt when there are no sessions yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      totalMinutes: 0, sessionCount: 0, minutesByDay: {}, minutesByArea: {}, estimateDivergences: [], mostProductiveHour: null,
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    renderPanel();

    expect(await screen.findByText(/No focus sessions in the last 30 days/)).toBeInTheDocument();
  });

  it('renders aggregated totals and per-area minutes when sessions exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      totalMinutes: 90,
      sessionCount: 3,
      minutesByDay: { '2026-01-05': 90 },
      minutesByArea: { WORK: 90 },
      estimateDivergences: [],
      mostProductiveHour: 9,
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    renderPanel();

    expect((await screen.findAllByText('1h 30m')).length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });
});
