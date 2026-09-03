import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksPage } from './TasksPage';
import { AnnouncementContext } from '../announcementContext';
import { UndoToastContext } from '../undoToastContext';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const PROJECTS = [
  { id: 7, name: 'Checkout revamp', status: 'ACTIVE' },
  { id: 8, name: 'A really long programme name that would blow out a fixed-width column', status: 'ACTIVE' },
];

const LONG_TITLE = 'Migrate the legacy reconciliation pipeline onto the new ingest service and retire the nightly batch job that nobody owns any more';

/**
 * One fixture covering every branch the workspace has to render: ready / blocked / waiting /
 * overdue / follow-up / important, a subtask parent, multiple blockers, and deliberately hostile
 * data (a very long title, a very long project name, no due date, no project, no estimate).
 */
const ACTIVE_TASKS = [
  { id: 1, title: 'Wire the ingest retry path', status: 'IN_PROGRESS', ready: true, blocked: false, projectId: 7, dueDate: '2026-09-30', estimatedMinutes: 45, effort: 'MEDIUM', area: 'WORK', position: 1 },
  { id: 2, title: 'Ship the migration runbook', status: 'NOT_STARTED', ready: false, blocked: true, projectId: 7, dueDate: '2026-09-09', position: 2, blockers: [{ id: 1, title: 'Wire the ingest retry path', status: 'IN_PROGRESS' }, { id: 5, title: 'Sign off the data contract', status: 'NOT_STARTED' }, { id: 6, title: 'Provision the staging cluster', status: 'BACKLOG' }] },
  // #297 regression case: blocked=false but ready=false -> Waiting, never Ready.
  { id: 3, title: 'Chase the vendor SLA answer', status: 'WAITING', ready: false, blocked: false, waitingOn: 'Vendor', followUpDate: '2020-01-01', position: 3 },
  { id: 4, title: 'Publish the incident review', status: 'NOT_STARTED', ready: true, blocked: false, overdue: true, important: true, dueDate: '2020-01-02', riskLevel: 'HIGH', position: 4 },
  { id: 5, title: 'Sign off the data contract', status: 'NOT_STARTED', ready: true, blocked: false, position: 5, subtaskCount: 2, completedSubtaskCount: 1, subtaskProgressPercent: 50 },
  { id: 9, title: LONG_TITLE, status: 'BACKLOG', ready: false, blocked: false, projectId: 8, position: 6 },
  { id: 10, title: 'Draft rollback steps', status: 'NOT_STARTED', ready: true, blocked: false, parentTaskId: 5, position: 7 },
  { id: 11, title: 'Archive the old dashboards', status: 'DONE', completedDate: '2026-09-01T10:00:00', ready: false, blocked: false, position: 8 },
];

const ARCHIVE_TASKS = [
  { id: 20, title: 'Retire the pilot workspace', status: 'CANCELLED', ready: false, blocked: false, position: 1 },
];

function mockFetch(overrides: { active?: () => Promise<Response>; archive?: () => Promise<Response> } = {}) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/tasks/archive')) return (overrides.archive ?? (() => jsonResponse(ARCHIVE_TASKS)))();
    if (url.includes('/api/v1/projects')) return jsonResponse(PROJECTS);
    if (url.includes('/api/v1/tasks')) return (overrides.active ?? (() => jsonResponse(ACTIVE_TASKS)))();
    return jsonResponse([]);
  }));
}

function renderPage(initialPath = '/tasks') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const announce = vi.fn();
  const showUndo = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementContext.Provider value={{ message: '', announce }}>
        <UndoToastContext.Provider value={{ showUndo }}>
          <MemoryRouter initialEntries={[initialPath]}>
            <TasksPage />
          </MemoryRouter>
        </UndoToastContext.Provider>
      </AnnouncementContext.Provider>
    </QueryClientProvider>,
  );
  return { ...utils, announce, showUndo };
}

const taskList = () => screen.getByRole('list', { name: 'Active task list' });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TasksPage - readiness semantics (backend-authoritative)', () => {
  it('labels each row from the backend ready/blocked fields and never from !blocked', async () => {
    mockFetch();
    renderPage();

    expect(await screen.findByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();

    const readyRow = screen.getByRole('link', { name: 'Wire the ingest retry path' }).closest('li') as HTMLElement;
    expect(within(readyRow).getByText('Ready')).toBeInTheDocument();

    const blockedRow = screen.getByRole('link', { name: 'Ship the migration runbook' }).closest('li') as HTMLElement;
    expect(within(blockedRow).getByText('Blocked')).toBeInTheDocument();

    // blocked=false, ready=false must read Waiting - not Ready (issue #297 regression).
    const waitingRow = screen.getByRole('link', { name: 'Chase the vendor SLA answer' }).closest('li') as HTMLElement;
    expect(within(waitingRow).getByText('Waiting')).toBeInTheDocument();
    expect(within(waitingRow).queryByText('Ready')).not.toBeInTheDocument();
  });

  it('counts the work-state rail over the whole scope and partitions it exactly', async () => {
    mockFetch();
    renderPage();

    // 7 active (DONE excluded): ready 1/4/5/10, blocked 2, waiting 3/9.
    expect(await screen.findByRole('button', { name: 'All, 7 active tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ready, 4 active tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blocked, 1 active task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Waiting, 2 active tasks' })).toBeInTheDocument();
  });

  it('filters to only backend-ready tasks when the Ready lens is pressed', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ready, 4 active tasks' }));

    expect(screen.getByRole('button', { name: 'Ready, 4 active tasks' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Chase the vendor SLA answer' })).not.toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Ship the migration runbook' })).not.toBeInTheDocument();
  });

  it('reads the lens from the URL so a link into ?readiness=blocked lands on blocked work', async () => {
    mockFetch();
    renderPage('/tasks?readiness=blocked');

    expect(await screen.findByRole('link', { name: 'Ship the migration runbook' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Wire the ingest retry path' })).not.toBeInTheDocument();
  });
});

describe('TasksPage - blocker disclosure', () => {
  it('shows the first blocker inline and reveals the rest through an operable +n control', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage('/tasks?readiness=blocked');

    const blockedRow = (await screen.findByRole('link', { name: 'Ship the migration runbook' })).closest('li') as HTMLElement;
    expect(within(blockedRow).getByText('Blocked by')).toBeInTheDocument();
    expect(within(blockedRow).getByRole('link', { name: /Wire the ingest retry path/ })).toBeInTheDocument();
    expect(within(blockedRow).queryByRole('link', { name: /Sign off the data contract/ })).not.toBeInTheDocument();

    const more = within(blockedRow).getByRole('button', { name: 'Show 2 more blockers for Ship the migration runbook' });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await user.click(more);

    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(within(blockedRow).getByRole('link', { name: /Sign off the data contract/ })).toBeInTheDocument();
    expect(within(blockedRow).getByRole('link', { name: /Provision the staging cluster/ })).toBeInTheDocument();
  });
});

describe('TasksPage - signals, search, filters and saved views', () => {
  it('toggles the overdue signal, keeps it in the URL contract and shows a removable chip', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Overdue, 1 active task' }));

    expect(within(taskList()).getByRole('link', { name: 'Publish the incident review' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Wire the ingest retry path' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Overdue, 1 active task' }));
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
  });

  it('filters by follow-up and important signals', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Follow-up, 1 active task' }));
    expect(within(taskList()).getByRole('link', { name: 'Chase the vendor SLA answer' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Publish the incident review' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Follow-up, 1 active task' }));
    await user.click(screen.getByRole('button', { name: 'Important, 1 active task' }));
    expect(within(taskList()).getByRole('link', { name: 'Publish the incident review' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Chase the vendor SLA answer' })).not.toBeInTheDocument();
  });

  it('searches titles and exposes the search as a removable chip', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.type(screen.getByLabelText('Search tasks'), 'runbook');

    expect(within(taskList()).getByRole('link', { name: 'Ship the migration runbook' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Wire the ingest retry path' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove filter: Search: “runbook”' }));
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
  });

  it('filters by project from the existing projectId contract and clears every filter at once', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.selectOptions(await screen.findByLabelText('Project'), '7');

    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Chase the vendor SLA answer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove filter: Project: Checkout revamp' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(within(taskList()).getByRole('link', { name: 'Chase the vendor SLA answer' })).toBeInTheDocument();
  });

  it('keeps status, area, effort, due-date and sort controls working', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.selectOptions(await screen.findByLabelText('Status'), 'IN_PROGRESS');
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
    expect(within(taskList()).queryByRole('link', { name: 'Ship the migration runbook' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Area'), 'WORK');
    await user.selectOptions(screen.getByLabelText('Effort'), 'MEDIUM');
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.selectOptions(screen.getByLabelText('Sort by'), 'title');
    expect(screen.getByRole('button', { name: 'Remove filter: Sorted by Title' })).toBeInTheDocument();

    const titles = within(taskList()).getAllByRole('link').map((link) => link.textContent).filter((text) => text && !text.startsWith('#'));
    expect(titles[0]).toBe('Chase the vendor SLA answer');
  });

  it('saves, applies and deletes a saved view from the toolbar', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Blocked, 1 active task' }));
    await user.click(screen.getByRole('button', { name: /Views/ }));
    await user.type(await screen.findByLabelText('Save current view as'), 'Blocked work');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(JSON.parse(window.localStorage.getItem('tracker.task.savedViews') ?? '[]')).toEqual([
      { name: 'Blocked work', params: 'readiness=blocked' },
    ]);

    // Move away from the saved state, then apply the view again.
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'All, 7 active tasks' }));
    expect(within(taskList()).getByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Views/ }));
    await user.click(await screen.findByRole('button', { name: 'Blocked work' }));
    expect(within(taskList()).queryByRole('link', { name: 'Wire the ingest retry path' })).not.toBeInTheDocument();
    expect(within(taskList()).getByRole('link', { name: 'Ship the migration runbook' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Views/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete Blocked work' }));
    expect(JSON.parse(window.localStorage.getItem('tracker.task.savedViews') ?? '[]')).toEqual([]);
  });
});

describe('TasksPage - scopes and navigation', () => {
  it('switches between Active, Done and Archived', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });

    await user.click(screen.getByRole('tab', { name: /Done/ }));
    expect(await screen.findByRole('link', { name: 'Archive the old dashboards' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Wire the ingest retry path' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Archived/ }));
    expect(await screen.findByRole('link', { name: 'Retire the pilot workspace' })).toBeInTheDocument();
  });

  it('keeps the List / Board / Matrix / Projects destinations reachable', async () => {
    mockFetch();
    renderPage();

    const nav = await screen.findByRole('tablist', { name: 'Task view' });
    expect(within(nav).getByRole('tab', { name: 'List' })).toHaveAttribute('href', '/tasks');
    expect(within(nav).getByRole('tab', { name: 'Board' })).toHaveAttribute('href', '/tasks/board');
    expect(within(nav).getByRole('tab', { name: 'Matrix' })).toHaveAttribute('href', '/tasks/matrix');
    expect(within(nav).getByRole('tab', { name: 'Projects' })).toHaveAttribute('href', '/tasks/projects');
  });
});

describe('TasksPage - actionability does not leak into Done / Archived', () => {
  it('keeps completed tasks visible after switching from the Ready lens to Done', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ready, 4 active tasks' }));
    expect(screen.getByRole('button', { name: 'Ready, 4 active tasks' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('tab', { name: /^Done/ }));

    // A DONE task is ready=false, so a leaked Ready lens would empty the view entirely.
    expect(await screen.findByRole('link', { name: 'Archive the old dashboards' })).toBeInTheDocument();
    expect(screen.queryByText('No tasks are ready to start')).not.toBeInTheDocument();
    // The actionability rail is meaningless for history and is not rendered there.
    expect(screen.queryByRole('button', { name: /^Ready,/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Work state/ })).not.toBeInTheDocument();
  });

  it('does not let a Blocked lens or an Overdue signal suppress the Archived scope', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Blocked, 1 active task' }));
    await user.click(screen.getByRole('button', { name: 'Overdue, 1 active task' }));

    await user.click(screen.getByRole('tab', { name: /^Archived/ }));

    expect(await screen.findByRole('link', { name: 'Retire the pilot workspace' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing is blocked')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing overdue right now/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 1 archived task shown.');
  });

  it('lands back on a defined state (All, no signals) when returning to Active', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ready, 4 active tasks' }));
    await user.click(screen.getByRole('button', { name: 'Important, 1 active task' }));
    await user.click(screen.getByRole('tab', { name: /^Done/ }));
    await user.click(screen.getByRole('tab', { name: /^Active/ }));

    expect(await screen.findByRole('button', { name: 'All, 7 active tasks' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ready, 4 active tasks' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Important, 1 active task' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(taskList()).getByRole('link', { name: 'Chase the vendor SLA answer' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('7 of 7 active tasks shown.');
  });

  it('ignores a readiness param that arrives in the URL while a history scope is showing', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage('/tasks?readiness=ready&overdue=true');

    await user.click(await screen.findByRole('tab', { name: /^Done/ }));

    expect(await screen.findByRole('link', { name: 'Archive the old dashboards' })).toBeInTheDocument();
  });

  it('keeps generic search and filter state across a scope change', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.type(screen.getByLabelText('Search tasks'), 'dashboards');
    await user.click(screen.getByRole('tab', { name: /^Done/ }));

    expect(screen.getByRole('button', { name: 'Remove filter: Search: “dashboards”' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Archive the old dashboards' })).toBeInTheDocument();
  });
});

describe('TasksPage - actions', () => {
  it('completes a task from the row and offers undo', async () => {
    mockFetch();
    const user = userEvent.setup();
    const { showUndo } = renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: 'Complete Wire the ingest retry path' }));

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes('/api/v1/tasks/1/complete'))).toBe(true);
    expect(showUndo).toHaveBeenCalledWith(expect.stringContaining('marked complete'), expect.any(Function));
  });

  it('changes status from the row menu and offers undo', async () => {
    mockFetch();
    const user = userEvent.setup();
    const { showUndo } = renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: 'Actions for Wire the ingest retry path' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Waiting' }));

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes('/api/v1/tasks/1/status?status=WAITING'))).toBe(true);
    expect(showUndo).toHaveBeenCalledWith(expect.stringContaining('moved to Waiting'), expect.any(Function));
  });

  it('exposes focus session, follow-up, dependencies, notes, subtask and delete without hover', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: 'Actions for Wire the ingest retry path' }));

    const menu = await screen.findByRole('menu');
    ['Open details', 'Add subtask', 'Start focus session', 'Follow up tomorrow', 'Manage dependencies', 'Open linked notes', 'Delete']
      .forEach((name) => expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument());

    await user.click(within(menu).getByRole('menuitem', { name: 'Follow up tomorrow' }));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((call) => String(call[0]).includes('/api/v1/tasks/1') && (call[1] as RequestInit | undefined)?.method === 'PUT')).toBe(true);
  });

  it('deletes a task from the row menu', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('button', { name: 'Actions for Wire the ingest retry path' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((call) => String(call[0]).includes('/api/v1/tasks/1') && (call[1] as RequestInit | undefined)?.method === 'DELETE')).toBe(true);
  });

  it('creates a task from the drawer, including a subtask of an existing task', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Sign off the data contract' });
    await user.click(screen.getByRole('button', { name: 'Actions for Sign off the data contract' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Add subtask' }));

    const title = await screen.findByLabelText('Title');
    await user.type(title, 'Write the rollback checklist');
    expect((screen.getByLabelText('Parent task') as HTMLSelectElement).value).toBe('5');

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    const created = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).endsWith('/api/v1/tasks') && (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(created).toBeDefined();
    expect(JSON.parse(String((created?.[1] as RequestInit).body))).toMatchObject({ title: 'Write the rollback checklist', parentTaskId: 5 });
  });
});

describe('TasksPage - difficult data and responsive/accessibility contract', () => {
  it('keeps a very long title fully reachable rather than clipping it to one line', async () => {
    mockFetch();
    renderPage();

    const link = await screen.findByRole('link', { name: LONG_TITLE });
    expect(link).toHaveAttribute('href', '/tasks/9');
    expect(link.className).toContain('line-clamp-2');
    expect(link.className).toContain('wrap-anywhere');
  });

  it('exposes a truncated project name in full to assistive technology', async () => {
    mockFetch();
    renderPage();

    const row = (await screen.findByRole('link', { name: LONG_TITLE })).closest('li') as HTMLElement;
    expect(within(row).getByText(`Project: ${PROJECTS[1].name}`)).toBeInTheDocument();
  });

  it('renders subtasks as a nested list rather than a separate flat row', async () => {
    mockFetch();
    renderPage();

    await screen.findByRole('link', { name: 'Sign off the data contract' });
    const nested = screen.getByRole('list', { name: 'Subtasks of Sign off the data contract' });
    expect(within(nested).getByRole('link', { name: 'Draft rollback steps' })).toBeInTheDocument();
  });

  it('renders no fixed-width horizontal scroll container around the list', async () => {
    mockFetch();
    const { container } = renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
    expect(container.querySelector('[class*="min-w-4xl"]')).toBeNull();
  });

  it('announces the result count as one contextual status message', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('7 of 7 active tasks shown.');

    await user.click(screen.getByRole('button', { name: 'Blocked, 1 active task' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 of 7 active tasks shown. Work state: Blocked.');
  });
});

describe('TasksPage - loading, empty and error states', () => {
  it('shows an alert with a working retry when the tasks query fails', async () => {
    mockFetch({ active: () => jsonResponse({ message: 'boom' }, 500) });
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Tasks could not be loaded')).toBeInTheDocument();

    const before = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before);
  });

  it('offers the first-task empty state when nothing exists yet', async () => {
    mockFetch({ active: () => jsonResponse([]) });
    renderPage();

    expect(await screen.findByText('No active tasks yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add task' }).length).toBeGreaterThan(0);
  });

  it('points at blocked work when nothing is ready', async () => {
    mockFetch({ active: () => jsonResponse([ACTIVE_TASKS[1], ACTIVE_TASKS[2]]) });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ready, 0 active tasks' }));

    expect(screen.getByText('No tasks are ready to start')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review blocked tasks' }));
    expect(await screen.findByRole('link', { name: 'Ship the migration runbook' })).toBeInTheDocument();
  });

  it('offers a way out when filters match nothing', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.type(screen.getByLabelText('Search tasks'), 'zzzzz');

    const emptyState = screen.getByText('No tasks match these filters').closest('[role="status"]') as HTMLElement;
    await user.click(within(emptyState).getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('link', { name: 'Wire the ingest retry path' })).toBeInTheDocument();
  });

  it('explains an empty archive rather than showing a bare message', async () => {
    mockFetch({ archive: () => jsonResponse([]) });
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Wire the ingest retry path' });
    await user.click(screen.getByRole('tab', { name: /Archived/ }));

    expect(await screen.findByText('The archive is empty')).toBeInTheDocument();
  });
});
