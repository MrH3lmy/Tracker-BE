import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectDetailPage } from './ProjectDetailPage';
import { AnnouncementContext } from '../announcementContext';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const PROJECT = { id: 1, name: 'Checkout revamp', status: 'ACTIVE' };
const OVERVIEW = {
  project: PROJECT,
  totalTasks: 2,
  completedTasks: 0,
  activeTasks: 2,
  overdueTasks: 1,
  progressPercent: 10,
  estimatedHours: 4,
  actualHours: 1,
  milestones: [{ id: 1, projectId: 1, title: 'Beta launch', status: 'PENDING' }],
  completedMilestones: 0,
  riskLevel: 'MEDIUM',
  riskReason: 'One task is overdue.',
};
const TASKS = [
  { id: 100, title: 'Ready checkout task', status: 'NOT_STARTED', projectId: 1, blocked: false, ready: true },
  {
    id: 101,
    title: 'Blocked checkout task',
    status: 'NOT_STARTED',
    projectId: 1,
    blocked: true,
    ready: false,
    blockers: [{ id: 100, title: 'Ready checkout task', status: 'NOT_STARTED' }],
  },
];

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/projects/1/overview')) return jsonResponse(OVERVIEW);
    if (url.includes('/api/v1/projects/1/milestones')) return jsonResponse(OVERVIEW.milestones);
    if (url.includes('/api/v1/projects/1/tasks')) return jsonResponse(TASKS);
    if (url.includes('/api/v1/projects/1/today')) return jsonResponse({ date: '2026-09-01', tasks: [] });
    if (url.includes('/api/v1/projects/1/notes')) return jsonResponse([]);
    if (url.includes('/api/v1/projects/1/activity')) return jsonResponse([]);
    if (url.includes('/api/v1/projects/1')) return jsonResponse(PROJECT);
    return jsonResponse([]);
  }));
}

function renderPage(initialPath = '/tasks/projects/1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementContext.Provider value={{ message: '', announce: () => {} }}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/tasks/projects/:id" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AnnouncementContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectDetailPage - Project Command Center', () => {
  it('renders all six command center tabs and defaults to Overview', async () => {
    mockFetch();
    renderPage();

    expect(await screen.findByText('Checkout revamp')).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Project sections' });
    for (const label of ['Overview', 'Today', 'Milestones', 'Notes', 'Activity']) {
      expect(within(tabs).getByRole('tab', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(within(tabs).getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Ready to work')).toBeInTheDocument();
    expect(screen.getByText('Next milestone')).toBeInTheDocument();
  });

  it('navigates to the Today tab and renders the project-scoped Today sections', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Checkout revamp');
    await user.click(screen.getByRole('tab', { name: 'Today' }));

    expect(await screen.findByText('Nothing due today')).toBeInTheDocument();
  });

  it('clicking the Blocked command tile jumps to the Tasks tab pre-filtered to blocked tasks', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Checkout revamp');
    await user.click(screen.getByRole('button', { name: /Blocked/ }));

    expect(await screen.findByText('Filtered: Blocked')).toBeInTheDocument();
    expect(screen.getByText('Blocked checkout task')).toBeInTheDocument();
    expect(screen.queryByText('Ready checkout task')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(await screen.findByText('Ready checkout task')).toBeInTheDocument();
  });

  it('navigates to the Notes tab and shows an empty state that teaches the next action', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Checkout revamp');
    await user.click(screen.getByRole('tab', { name: 'Notes' }));

    expect(await screen.findByText('No project notes yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create project note/ })).toHaveAttribute('href', '/notes?projectId=1');
  });

  it('navigates to the Activity tab and shows the empty timeline state', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Checkout revamp');
    await user.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
  });
});
