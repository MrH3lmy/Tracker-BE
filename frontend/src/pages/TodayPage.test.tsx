import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodayPage } from './TodayPage';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const HOME_TODAY_BODY = { summary: { totalTasks: 3, overdueTasks: 1, dueToday: 1 } };

function mockFetch(todayTasksHandler: (url: string) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/home/today')) return jsonResponse(HOME_TODAY_BODY);
    if (url.includes('/api/v1/tasks/today')) return todayTasksHandler(url);
    if (url.includes('/api/v1/weekly-reviews')) return jsonResponse([]);
    return jsonResponse([]);
  }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TodayPage - Today v2 sections', () => {
  it('groups ready tasks by overdue/due today/scheduled today and shows blocked tasks separately with blocker details', async () => {
    mockFetch(() => jsonResponse({
      date: '2026-09-01',
      tasks: [
        { task: { id: 1, title: 'Ship overdue report', status: 'NOT_STARTED', ready: true }, todayReason: 'OVERDUE', blocked: false },
        { task: { id: 2, title: 'Finish due-today doc', status: 'NOT_STARTED', ready: true }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 3, title: 'Prep scheduled review', status: 'NOT_STARTED', ready: true }, todayReason: 'SCHEDULED_TODAY', blocked: false },
        {
          task: { id: 4, title: 'Implement frontend checkout', status: 'NOT_STARTED', ready: false, blockers: [{ id: 10, title: 'Implement checkout API', status: 'IN_PROGRESS' }, { id: 11, title: 'Finalize payment contract', status: 'NOT_STARTED' }] },
          todayReason: 'DUE_TODAY',
          blocked: true,
        },
      ],
    }));

    const user = userEvent.setup();
    const { container } = renderPage();

    expect(await screen.findByText('Ready to work')).toBeInTheDocument();
    const todaySections = container.querySelector('[aria-labelledby="today-sections-title"]') as HTMLElement;

    expect(within(todaySections).getByText('Overdue')).toBeInTheDocument();
    expect(within(todaySections).getByText('Due today')).toBeInTheDocument();
    expect(within(todaySections).getByText('Scheduled today')).toBeInTheDocument();
    expect(within(todaySections).getByText('Ship overdue report')).toBeInTheDocument();
    expect(within(todaySections).getByText('Finish due-today doc')).toBeInTheDocument();
    expect(within(todaySections).getByText('Prep scheduled review')).toBeInTheDocument();

    expect(within(todaySections).getByRole('heading', { name: 'Blocked' })).toBeInTheDocument();
    expect(within(todaySections).getByText('Implement frontend checkout')).toBeInTheDocument();

    const disclosureTrigger = within(todaySections).getByRole('button', { name: /Waiting for 2 tasks/ });
    await user.click(disclosureTrigger);

    expect(await within(todaySections).findByRole('link', { name: /Implement checkout API/ })).toBeInTheDocument();
    expect(within(todaySections).getByRole('link', { name: /Finalize payment contract/ })).toBeInTheDocument();
  });

  it('classifies tasks by the backend-provided ready field, not by inverting blocked (issue #297 regression)', async () => {
    mockFetch(() => jsonResponse({
      date: '2026-09-01',
      tasks: [
        { task: { id: 1, title: 'Actionable not-started', status: 'NOT_STARTED', ready: true }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 2, title: 'Actionable in-progress', status: 'IN_PROGRESS', ready: true }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 3, title: 'Waiting on someone', status: 'WAITING', ready: false }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 4, title: 'Sitting in backlog', status: 'BACKLOG', ready: false }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 5, title: 'Manually marked blocked', status: 'BLOCKED', ready: false }, todayReason: 'DUE_TODAY', blocked: false },
        { task: { id: 6, title: 'Dependency-blocked task', status: 'NOT_STARTED', ready: false }, todayReason: 'DUE_TODAY', blocked: true },
      ],
    }));

    const { container } = renderPage();
    await screen.findByText('Ready to work');

    const readySection = container.querySelector('[aria-labelledby="today-ready-heading"]') as HTMLElement;
    const blockedSection = container.querySelector('[aria-labelledby="today-blocked-heading"]') as HTMLElement;
    const waitingSection = container.querySelector('[aria-labelledby="today-waiting-heading"]') as HTMLElement;

    expect(within(readySection).getByText('Actionable not-started')).toBeInTheDocument();
    expect(within(readySection).getByText('Actionable in-progress')).toBeInTheDocument();
    expect(within(readySection).queryByText('Waiting on someone')).not.toBeInTheDocument();
    expect(within(readySection).queryByText('Sitting in backlog')).not.toBeInTheDocument();
    expect(within(readySection).queryByText('Manually marked blocked')).not.toBeInTheDocument();
    expect(within(readySection).queryByText('Dependency-blocked task')).not.toBeInTheDocument();

    expect(within(blockedSection).getByText('Dependency-blocked task')).toBeInTheDocument();
    expect(within(blockedSection).queryByText('Waiting on someone')).not.toBeInTheDocument();

    expect(within(waitingSection).getByText('Waiting on someone')).toBeInTheDocument();
    expect(within(waitingSection).getByText('Sitting in backlog')).toBeInTheDocument();
    expect(within(waitingSection).getByText('Manually marked blocked')).toBeInTheDocument();
    expect(within(waitingSection).queryByText('Dependency-blocked task')).not.toBeInTheDocument();
    expect(within(waitingSection).queryByText('Actionable not-started')).not.toBeInTheDocument();
  });

  it('shows a loading state for the today sections while the request is in flight', async () => {
    mockFetch(() => new Promise(() => {}));
    renderPage();

    expect(await screen.findByText('Loading today...')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is due today', async () => {
    mockFetch(() => jsonResponse({ date: '2026-09-01', tasks: [] }));
    renderPage();

    expect(await screen.findByText('Nothing due today')).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the today request fails', async () => {
    mockFetch(() => Promise.reject(new Error('network down')));
    renderPage();

    expect(await screen.findByText("Couldn't load today's tasks")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
