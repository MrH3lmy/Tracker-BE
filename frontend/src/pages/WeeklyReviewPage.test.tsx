import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeeklyReviewPage } from './WeeklyReviewPage';
import { AnnouncementContext } from '../announcementContext';

const draft = {
  weekStartDate: '2026-01-05',
  weekEndDate: '2026-01-11',
  completedTasks: [{ id: 1, title: 'Ship report', completedDate: '2026-01-06T10:00:00' }],
  overdueTasks: [{ id: 2, title: 'Renew contract', dueDate: '2026-01-01', status: 'NOT_STARTED' }],
  blockedOrWaitingTasks: [],
  habitPerformance: [],
  projectsAtRisk: [],
  staleTasks: [],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementContext.Provider value={{ message: '', announce: () => {} }}>
        <MemoryRouter>
          <WeeklyReviewPage />
        </MemoryRouter>
      </AnnouncementContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WeeklyReviewPage', () => {
  it('shows completed tasks for the current week on the first step', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(draft), { status: 200, headers: { 'content-type': 'application/json' } })));
    renderPage();

    expect(await screen.findByText('Ship report')).toBeInTheDocument();
  });

  it('steps to Overdue and lets a task be archived as a decision', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(draft), { status: 200, headers: { 'content-type': 'application/json' } })));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Ship report');
    await user.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(await screen.findByText('Renew contract')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /archive/i }));
    expect(await screen.findByText('Archived')).toBeInTheDocument();
  });

  it('shows the decision count on the summary step', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(draft), { status: 200, headers: { 'content-type': 'application/json' } })));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Ship report');
    await user.click(screen.getByRole('button', { name: 'Overdue' }));
    await user.click(await screen.findByRole('button', { name: /archive/i }));
    await user.click(screen.getByRole('button', { name: 'Plan & summary' }));

    expect(await screen.findByText('1 decision will be applied when you finish.')).toBeInTheDocument();
  });
});
