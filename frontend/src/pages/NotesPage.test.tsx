import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

/** Renders the current location so navigation out of the library can be asserted. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = '/notes') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<LocationProbe />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** URLs of every GET the page issued against the notes list endpoint, newest last. */
function noteListRequests(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => /\/api\/v1\/notes(\?|$)/.test(url));
}

function lastNoteListRequest(fetchMock: ReturnType<typeof vi.fn>): string {
  const requests = noteListRequests(fetchMock);
  return requests[requests.length - 1] ?? '';
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NotesPage - typed/project notes', () => {
  it('sends "New note" to the page editor rather than opening a drawer', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'New note' }));

    expect(screen.getAllByTestId('location')[0]).toHaveTextContent('/notes/new');
    expect(screen.queryByLabelText('Project (optional)')).not.toBeInTheDocument();
  });

  it('shows the note type badge for a non-general project note in the list', async () => {
    mockFetch(baseFetchImpl());
    renderPage();

    const card = (await screen.findByText('Sprint planning notes')).closest('div');
    expect(card).not.toBeNull();
    // Type and project now read as the card's meta line rather than two coloured badges;
    // "Meeting" also appears as a type lens above the results, so scope the assertion.
    expect(within(card as HTMLElement).getByText('Meeting')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Checkout revamp')).toBeInTheDocument();
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

describe('NotesPage - knowledge workspace navigation (issue #299)', () => {
  it('turns a smart view into a real server-side query instead of a client-side teaser list', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    await user.click(screen.getByRole('button', { name: 'Decisions' }));

    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('type=DECISION'));
  });

  it('scopes Task notes and Archived to the whole library, not the first five loaded notes', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');

    await user.click(screen.getByRole('button', { name: 'Task notes' }));
    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('linkedTask=true'));

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('tag=archived'));
  });

  it('marks the selected smart view as current for assistive technology', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    // "Research" is both a smart view and a type lens; scope to the rail.
    const rail = screen.getByRole('navigation', { name: 'Notes navigation' });
    const research = within(rail).getByRole('button', { name: 'Research' });
    await user.click(research);

    expect(research).toHaveAttribute('aria-current', 'true');
    expect(within(rail).getByRole('button', { name: 'All notes' })).not.toHaveAttribute('aria-current');
  });

  it('filters by collection from the navigation rail', async () => {
    const fetchMock = baseFetchImpl({
      '/api/v1/note-collections': () => jsonResponse([{ id: 7, name: 'Work', color: '#0f766e' }]),
    });
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Work' }));

    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('collectionId=7'));
  });

  it('applies a stored saved view, including its display mode', async () => {
    const fetchMock = baseFetchImpl({
      '/api/v1/note-saved-views': () => jsonResponse([
        {
          id: 3,
          name: 'Backend research',
          filters: { tags: 'backend', contentType: 'MARKDOWN', hasAttachments: true },
          sortField: 'createdAt',
          sortDirection: 'asc',
          viewType: 'table',
        },
      ]),
    });
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Backend research' }));

    await waitFor(() => {
      const url = lastNoteListRequest(fetchMock);
      expect(url).toContain('tag=backend');
      expect(url).toContain('contentType=MARKDOWN');
      expect(url).toContain('hasAttachments=true');
      expect(url).toContain('sortBy=createdAt');
      expect(url).toContain('sortDirection=asc');
    });
    expect(await screen.findByRole('table', { name: 'Notes table' })).toBeInTheDocument();
  });
});

describe('NotesPage - search and filtering (issue #299)', () => {
  it('debounces the search box into a single q parameter', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    const before = noteListRequests(fetchMock).length;
    await user.type(screen.getByLabelText('Search your notes'), 'postgres');

    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('q=postgres'));
    // "postgres" is eight keystrokes; debouncing must not mean eight extra requests.
    expect(noteListRequests(fetchMock).length - before).toBeLessThan(8);
  });

  it('narrows by note type from the lens row without discarding the search term', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    await user.type(screen.getByLabelText('Search your notes'), 'retry');
    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('q=retry'));

    await user.click(within(screen.getByRole('group', { name: 'Filter notes by type' })).getByRole('button', { name: 'Technical' }));

    await waitFor(() => {
      const url = lastNoteListRequest(fetchMock);
      expect(url).toContain('type=TECHNICAL');
      expect(url).toContain('q=retry');
    });
  });

  it('filters by project and shows a removable active filter chip', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    await user.selectOptions(screen.getByLabelText('Project'), '1');

    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('projectId=1'));
    expect(screen.getByText('Project: Checkout revamp')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filter: Project: Checkout revamp' }));
    await waitFor(() => expect(lastNoteListRequest(fetchMock)).not.toContain('projectId=1'));
  });

  it('keeps the long-tail filters behind a disclosure and counts the active ones', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    expect(screen.queryByLabelText('Tag match')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /More filters/ }));
    await user.selectOptions(await screen.findByLabelText('Tag match'), 'all');

    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('tagMode=all'));
    expect(screen.getByLabelText('1 advanced filters active')).toBeInTheDocument();
  });

  it('clears every filter at once', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    await user.selectOptions(screen.getByLabelText('Project'), '1');
    await screen.findByText('Project: Checkout revamp');

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    await waitFor(() => expect(screen.queryByText('Project: Checkout revamp')).not.toBeInTheDocument());
  });
});

describe('NotesPage - result presentation (issue #299)', () => {
  it('switches display mode without losing the result set', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Table' }));
    expect(await screen.findByRole('table', { name: 'Notes table' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sticky board' }));
    expect(await screen.findByLabelText('Sticky note board')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(await screen.findByLabelText('Notes timeline')).toBeInTheDocument();
  });

  it('reports how many notes are loaded without inventing a global total', async () => {
    mockFetch(baseFetchImpl());
    renderPage();

    await screen.findByText('Sprint planning notes');
    const status = screen.getByRole('status', { name: '' });
    expect(status).toHaveTextContent('1 note');
    expect(screen.queryByText(/Total notes/i)).not.toBeInTheDocument();
  });

  it('teaches the next action when a smart view is empty', async () => {
    mockFetch(baseFetchImpl({ '/api/v1/notes': () => jsonResponse([]) }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Decisions' }));

    expect(await screen.findByText('Nothing in Decisions yet')).toBeInTheDocument();
    expect(screen.getByText(/Set a note’s type to Decision/)).toBeInTheDocument();
  });

  it('offers a retry path when the list request fails', async () => {
    const fetchMock = baseFetchImpl({
      '/api/v1/notes': () => jsonResponse({ message: 'Upstream exploded' }, 500),
    });
    mockFetch(fetchMock);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Couldn't load your notes")).toBeInTheDocument();
    const before = noteListRequests(fetchMock).length;
    await user.click(screen.getByRole('button', { name: /Try again/ }));

    await waitFor(() => expect(noteListRequests(fetchMock).length).toBeGreaterThan(before));
  });
});

describe('NotesPage - context and capture (issue #299)', () => {
  it('states the project scope up front when opened with ?projectId=', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    renderPage('/notes?projectId=1');

    const banner = await screen.findByLabelText('Notes context');
    expect(await within(banner).findByText('Checkout revamp')).toBeInTheDocument();
    expect(within(banner).getByText('Showing notes that belong to this project.')).toBeInTheDocument();
    // The project detail route is /tasks/projects/:id - asserting the real route, not a
    // convenient-looking one, is the point of this assertion.
    expect(within(banner).getByRole('link', { name: 'Open project' })).toHaveAttribute('href', '/tasks/projects/1');
    await waitFor(() => expect(lastNoteListRequest(fetchMock)).toContain('projectId=1'));
  });

  it('states the task scope and offers a way back to the whole library with ?taskId=', async () => {
    mockFetch(baseFetchImpl());
    renderPage('/notes?taskId=12');

    const banner = await screen.findByLabelText('Notes context');
    expect(within(banner).getByText('Showing notes linked to this task, in sticky order.')).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Show all notes' })).toHaveAttribute('href', '/notes');
  });

  it('seeds the search box from ?q= and the type lens from ?type=', async () => {
    const fetchMock = baseFetchImpl();
    mockFetch(fetchMock);
    renderPage('/notes?q=callback&type=DECISION');

    expect(await screen.findByLabelText('Search your notes')).toHaveValue('callback');
    await waitFor(() => {
      const url = lastNoteListRequest(fetchMock);
      expect(url).toContain('q=callback');
      expect(url).toContain('type=DECISION');
    });
  });

  it('opens a note as a page, carrying the library filters in ?return=', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage('/notes?projectId=1&type=MEETING&q=paci');

    await user.click(await screen.findByRole('button', { name: 'Sprint planning notes' }));

    const location = screen.getAllByTestId('location')[0].textContent ?? '';
    expect(location).toContain('/notes/1');
    const returnParam = decodeURIComponent(new URLSearchParams(location.split('?')[1]).get('return') ?? '');
    expect(returnParam).toContain('projectId=1');
    expect(returnParam).toContain('type=MEETING');
    expect(returnParam).toContain('q=paci');
  });

  it('carries the project context into a new note created from a filtered library', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage('/notes?projectId=1');

    await user.click(await screen.findByRole('button', { name: 'New note' }));

    const location = screen.getAllByTestId('location')[0].textContent ?? '';
    expect(location).toContain('/notes/new');
    expect(location).toContain('projectId=1');
  });

  it('exposes the same navigation on mobile through an intentional sheet', async () => {
    mockFetch(baseFetchImpl());
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Sprint planning notes');
    await user.click(screen.getByRole('button', { name: /^Browse/ }));

    const sheet = await screen.findByRole('dialog', { name: 'Browse notes' });
    expect(within(sheet).getByRole('button', { name: 'Meeting notes' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'All notes' })).toBeInTheDocument();
  });
});
