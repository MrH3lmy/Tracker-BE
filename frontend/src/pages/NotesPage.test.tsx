import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotesPage } from './NotesPage';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const PROJECTS = [{ id: 1, name: 'Checkout revamp', status: 'ACTIVE' }];

const NOTE_WITH_ACTION_ITEM = {
  id: 1,
  title: 'Sprint planning notes',
  body: 'Discussed the sprint.',
  contentType: 'PLAIN_TEXT',
  noteType: 'MEETING',
  projectId: 1,
  blocks: [{ id: 42, noteId: 1, type: 'checklist', content: 'Send the follow-up email', position: 0, checked: false }],
  taskLinks: [],
};

function mockFetch(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
}

function baseFetchImpl(overrides: Record<string, () => Promise<Response>> = {}) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    for (const [matcher, handler] of Object.entries(overrides)) {
      if (url.includes(matcher)) return handler();
    }
    if (url.includes('/api/v1/notes') && method === 'GET') return jsonResponse([NOTE_WITH_ACTION_ITEM]);
    if (url.includes('/api/v1/note-templates')) return jsonResponse([]);
    if (url.includes('/api/v1/note-collections')) return jsonResponse([]);
    if (url.includes('/api/v1/note-saved-views')) return jsonResponse([]);
    if (url.includes('/api/v1/settings')) return jsonResponse({});
    if (url.includes('/api/v1/projects')) return jsonResponse(PROJECTS);
    if (url.includes('/api/v1/tasks')) return jsonResponse([]);
    return jsonResponse([]);
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NotesPage - typed/project notes', () => {
  it('offers a project selector and a note type selector when creating a note', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'New note' }));

    const projectSelect = screen.getByLabelText('Project (optional)') as HTMLSelectElement;
    expect(within(projectSelect).getByText('Checkout revamp')).toBeInTheDocument();

    const noteTypeSelect = screen.getByLabelText('Note type') as HTMLSelectElement;
    expect(within(noteTypeSelect).getByText('Meeting')).toBeInTheDocument();
    expect(within(noteTypeSelect).getByText('Decision')).toBeInTheDocument();
    expect(noteTypeSelect.value).toBe('GENERAL');
  });

  it('shows the note type badge for a non-general project note in the list', async () => {
    mockFetch(baseFetchImpl());
    renderPage();

    expect(await screen.findByText('Sprint planning notes')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Checkout revamp')).toBeInTheDocument();
  });
});

describe('NotesPage - structured meeting action conversion', () => {
  it('sends noteBlockId when converting a persisted structured action item to a task', async () => {
    const fetchMock = baseFetchImpl({
      '/api/v1/notes/1/convert-selection-to-task': () => jsonResponse({
        task: { id: 55, title: 'Send the follow-up email', projectId: 1 },
        link: { id: 9, noteId: 1, blockId: 42, taskId: 55 },
      }, 201),
    });
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Convert to task' }));
    expect(await screen.findByText(/Converting this action item/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create linked task' }));

    const conversionCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/convert-selection-to-task'));
    expect(conversionCall).toBeDefined();
    const [, init] = conversionCall!;
    const body = JSON.parse(String(init?.body));
    expect(body.noteBlockId).toBe(42);
  });
});
