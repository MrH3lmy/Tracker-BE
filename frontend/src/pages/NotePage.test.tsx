import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotePage } from './NotePage';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

const PROJECTS = [{ id: 1, name: 'Tracker Mobile App', status: 'ACTIVE' }];
const TASKS = [{ id: 318, title: 'Update API docs' }];
const COLLECTIONS = [{ id: 2, name: 'Work' }];

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: 'PACI integration meeting',
    body: 'Walked through the callback contract.',
    contentType: 'PLAIN_TEXT',
    noteType: 'MEETING',
    projectId: 1,
    collectionId: 2,
    collectionName: 'Work',
    tags: ['paci'],
    taskLinks: [],
    blocks: [
      { id: 91, noteId: 7, type: 'paragraph', content: 'Walked through the callback contract.', position: 0, checked: false },
    ],
    ...overrides,
  };
}

/** Records every note-update request so save sequencing can be asserted. */
let updateBodies: Array<Record<string, unknown>>;

function baseFetchImpl(overrides: Record<string, (init?: RequestInit) => Promise<Response>> = {}, note = makeNote()) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    for (const [matcher, handler] of Object.entries(overrides)) {
      if (url.includes(matcher)) return handler(init);
    }
    if (url.includes('/api/v1/projects')) return jsonResponse(PROJECTS);
    if (url.includes('/api/v1/note-collections')) return jsonResponse(COLLECTIONS);
    if (url.includes('/api/v1/tasks')) return jsonResponse(TASKS);
    if (url.match(/\/api\/v1\/notes\/\d+$/) && method === 'PUT') {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      updateBodies.push(body);
      const blocks = (body.blocks as Array<Record<string, unknown>> | undefined) ?? [];
      return jsonResponse({
        ...note,
        ...body,
        blocks: blocks.map((block, index) => ({ ...block, id: block.id ?? 500 + index, noteId: note.id, position: index })),
      });
    }
    if (url.includes('/api/v1/notes') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      updateBodies.push(body);
      return jsonResponse({ ...note, id: 42, ...body, blocks: [] }, 201);
    }
    if (url.match(/\/api\/v1\/notes\/\d+$/)) return jsonResponse(note);
    return jsonResponse([]);
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderNotePage(entry = '/notes/7') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/notes/:id" element={<NotePage />} />
          <Route path="/notes" element={<div>Notes library</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The first block's editable field. */
async function firstBlock() {
  return (await screen.findAllByRole('textbox')).find((element) => element.id.startsWith('block-')) as HTMLTextAreaElement;
}

beforeEach(() => {
  updateBodies = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('NotePage - the document is the editable surface', () => {
  it('renders the title and blocks as editable content, not a form', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    renderNotePage();

    const title = await screen.findByLabelText('Note title');
    expect(title).toHaveValue('PACI integration meeting');
    expect(await firstBlock()).toHaveValue('Walked through the callback contract.');
    // No drawer, no Save button: the page saves itself.
    expect(screen.queryByRole('button', { name: 'Save note' })).not.toBeInTheDocument();
  });

  it('shows properties as a quiet summary that expands into controls', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const summary = await screen.findByRole('button', { name: /Edit note properties/ });
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Note type')).not.toBeInTheDocument();

    await user.click(summary);
    expect(await screen.findByLabelText('Note type')).toHaveValue('MEETING');
    expect(screen.getByLabelText('Project')).toHaveValue('1');
    expect(screen.getByLabelText('Collection')).toHaveValue('2');
  });
});

describe('NotePage - block keyboard model', () => {
  it('Enter splits the block at the caret and moves focus to the new one', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    block.setSelectionRange(7, 7);
    await user.keyboard('{Enter}');

    const blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-'));
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveValue('Walked ');
    expect(blocks[1]).toHaveValue('through the callback contract.');
    await waitFor(() => expect(document.activeElement).toBe(blocks[1]));
  });

  it('Backspace at the start of a block merges it into the previous one and restores the caret', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    block.setSelectionRange(7, 7);
    await user.keyboard('{Enter}');

    let blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-')) as HTMLTextAreaElement[];
    await user.click(blocks[1]);
    blocks[1].setSelectionRange(0, 0);
    await user.keyboard('{Backspace}');

    blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-')) as HTMLTextAreaElement[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveValue('Walked through the callback contract.');
    await waitFor(() => expect((blocks[0] as HTMLTextAreaElement).selectionStart).toBe(7));
  });

  it('never leaves the document with nothing to type into', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    await user.clear(block);
    block.setSelectionRange(0, 0);
    await user.keyboard('{Backspace}');

    const blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-'));
    expect(blocks).toHaveLength(1);
  });

  it('Enter on an empty checklist item leaves the list instead of stacking empty items', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    await user.clear(block);
    await user.type(block, '/check');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('checkbox')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
  });
});

describe('NotePage - slash command palette', () => {
  it('opens on "/", filters, and creates the chosen block type', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    await user.clear(block);
    await user.type(block, '/head');

    const listbox = await screen.findByRole('listbox', { name: 'Block commands' });
    expect(within(listbox).getByRole('option', { name: /Heading/ })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: /Divider/ })).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    // The "/head" text that opened the palette is consumed, not left in the document.
    expect(await firstBlock()).toHaveValue('');
    expect(screen.getByLabelText(/Heading block 1 of 1/)).toBeInTheDocument();
  });

  it('moves the highlight with ArrowDown and ArrowUp', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    await user.clear(block);
    await user.type(block, '/');

    const listbox = await screen.findByRole('listbox', { name: 'Block commands' });
    expect(within(listbox).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(within(listbox).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}');
    expect(within(listbox).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape dismisses the palette and keeps the caret in the block', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    await user.clear(block);
    await user.type(block, '/quo');
    expect(await screen.findByRole('listbox', { name: 'Block commands' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(await firstBlock());
  });
});

describe('NotePage - block controls', () => {
  it('reorders with keyboard-reachable menu commands, not only by dragging', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.click(block);
    block.setSelectionRange(7, 7);
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: /Block options for Text block 2/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Move up/ }));

    const blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-'));
    expect(blocks[0]).toHaveValue('through the callback contract.');
    expect(blocks[1]).toHaveValue('Walked ');
  });

  it('duplicates and deletes a block from its menu', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    await user.click(await screen.findByRole('button', { name: /Block options for Text block 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Duplicate/ }));
    let blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-'));
    expect(blocks).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /Block options for Text block 2/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Delete/ }));
    blocks = (await screen.findAllByRole('textbox')).filter((element) => element.id.startsWith('block-'));
    expect(blocks).toHaveLength(1);
  });

  it('turns a block into another type from the menu', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    await user.click(await screen.findByRole('button', { name: /Block options for Text block 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Checklist' }));

    expect(await screen.findByRole('checkbox')).toBeInTheDocument();
  });

  it('toggles a checklist item and persists the checked state', async () => {
    const note = makeNote({
      blocks: [{ id: 91, noteId: 7, type: 'checklist', content: 'Investigate retry backoff', position: 0, checked: false }],
    });
    vi.stubGlobal('fetch', baseFetchImpl({}, note));
    const user = userEvent.setup();
    renderNotePage();

    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await user.click(checkbox);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');

    await waitFor(() => expect(updateBodies.length).toBeGreaterThan(0));
    const blocks = updateBodies[updateBodies.length - 1].blocks as Array<Record<string, unknown>>;
    expect(blocks[0].checked).toBe(true);
  });
});

describe('NotePage - structured action to task', () => {
  it('converts an action item with its real noteBlockId', async () => {
    const note = makeNote({
      blocks: [{ id: 91, noteId: 7, type: 'checklist', content: 'Investigate retry backoff', position: 0, checked: false }],
    });
    let convertBody: Record<string, unknown> | null = null;
    vi.stubGlobal('fetch', baseFetchImpl({
      '/convert-selection-to-task': (init) => {
        convertBody = JSON.parse(String(init?.body));
        return jsonResponse({ task: { id: 55 }, link: { id: 9, noteId: 7, blockId: 91, taskId: 55 } }, 201);
      },
    }, note));
    const user = userEvent.setup();
    renderNotePage();

    await user.click(await screen.findByRole('button', { name: /Block options for Checklist block 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Convert to task' }));
    await user.click(await screen.findByRole('button', { name: 'Create linked task' }));

    await waitFor(() => expect(convertBody).not.toBeNull());
    expect(convertBody!.noteBlockId).toBe(91);
  });

  it('links an already-converted action to its task instead of offering to convert again', async () => {
    const note = makeNote({
      blocks: [{ id: 91, noteId: 7, type: 'checklist', content: 'Update API docs', position: 0, checked: false }],
      taskLinks: [{ id: 9, noteId: 7, blockId: 91, taskId: 318, taskTitle: 'Update API docs' }],
    });
    vi.stubGlobal('fetch', baseFetchImpl({}, note));
    const user = userEvent.setup();
    renderNotePage();

    expect(await screen.findByRole('link', { name: /Task created/ })).toHaveAttribute('href', '/tasks/318');

    await user.click(screen.getByRole('button', { name: /Block options for Checklist block 1/ }));
    expect(screen.queryByRole('menuitem', { name: 'Convert to task' })).not.toBeInTheDocument();
  });
});

describe('NotePage - autosave', () => {
  it('debounces edits into one save and reports Saving then Saved', async () => {
    const fetchMock = baseFetchImpl();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderNotePage();

    const title = await screen.findByLabelText('Note title');
    await user.type(title, '!!');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 4000 });
    // Two keystrokes must not mean two round trips.
    expect(updateBodies).toHaveLength(1);
    expect(updateBodies[0].title).toBe('PACI integration meeting!!');
    // Autosaves are flagged so the backend applies the debounced version policy.
    expect(updateBodies[0].autosave).toBe(true);
  });

  it('sends the blocks with their server ids so the backend can update rows in place', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    const block = await firstBlock();
    await user.type(block, ' Confirmed.');

    await waitFor(() => expect(updateBodies.length).toBeGreaterThan(0), { timeout: 4000 });
    const blocks = updateBodies[updateBodies.length - 1].blocks as Array<Record<string, unknown>>;
    expect(blocks[0].id).toBe(91);
  });

  it('shows a persistent error with a retry when a save fails, and never claims Saved', async () => {
    let failNext = true;
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return jsonResponse(makeNote());
        if (failNext) {
          failNext = false;
          return jsonResponse({ message: 'Upstream exploded' }, 500);
        }
        updateBodies.push(JSON.parse(String(init?.body)));
        return jsonResponse(makeNote());
      },
    }));
    const user = userEvent.setup();
    renderNotePage();

    await user.type(await screen.findByLabelText('Note title'), '!');

    const alert = await screen.findByRole('alert', {}, { timeout: 4000 });
    expect(within(alert).getByText('Not saved')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 4000 });
  });

  it('never lets a slow earlier save overwrite a newer edit', async () => {
    const resolvers: Array<(value: Response) => void> = [];
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return jsonResponse(makeNote());
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        updateBodies.push(body);
        // Hold the response open so a second edit lands while this one is in flight.
        return new Promise<Response>((resolve) => {
          resolvers.push(() => resolve(new Response(JSON.stringify({ ...makeNote(), title: 'STALE SERVER TITLE' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })));
        });
      },
    }));
    const user = userEvent.setup();
    renderNotePage();

    const title = await screen.findByLabelText('Note title');
    await user.type(title, 'A');
    await waitFor(() => expect(updateBodies).toHaveLength(1), { timeout: 4000 });

    // Type again while the first save is still open, then let the stale response land.
    await user.type(title, 'B');
    resolvers[0]?.(new Response());

    // The editor keeps the newer local text; the response body is never adopted as content.
    await waitFor(() => expect(screen.getByLabelText('Note title')).toHaveValue('PACI integration meetingAB'));
    expect(screen.queryByDisplayValue('STALE SERVER TITLE')).not.toBeInTheDocument();
    // And the newer revision is still saved, in a second request rather than concurrently.
    await waitFor(() => expect(updateBodies.length).toBe(2), { timeout: 4000 });
    expect(updateBodies[1].title).toBe('PACI integration meetingAB');
  });
});

describe('NotePage - autosave races (blocking review on #301)', () => {
  it('opening a note never autosaves it: no PUT until the user actually edits', async () => {
    const fetchMock = baseFetchImpl();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderNotePage();

    await screen.findByLabelText('Note title');
    // Well past the 900ms debounce.
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const puts = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
    expect(puts).toHaveLength(0);
    expect(updateBodies).toHaveLength(0);
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    // And a real edit still saves.
    await user.type(screen.getByLabelText('Note title'), '!');
    await waitFor(() => expect(updateBodies).toHaveLength(1), { timeout: 4000 });
  });

  it('assigns new block ids to the right client block when the user reorders mid-save', async () => {
    // Typed as a mutable holder: TS narrows a `let` assigned only inside a callback to `never`.
    const firstSaveGate: { release: (() => void) | null } = { release: null };
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return jsonResponse(makeNote());
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        updateBodies.push(body);
        const sent = body.blocks as Array<Record<string, unknown>>;
        // Server assigns ids in the order it was sent: [existing 91, new 500].
        const saved = sent.map((block, index) => ({
          ...block,
          id: block.id ?? 500 + index,
          noteId: 7,
          position: index,
        }));
        if (updateBodies.length === 1) {
          return new Promise<Response>((resolve) => {
            firstSaveGate.release = () => resolve(new Response(JSON.stringify({ ...makeNote(), blocks: saved }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }));
          });
        }
        return jsonResponse({ ...makeNote(), blocks: saved });
      },
    }));
    const user = userEvent.setup();
    renderNotePage();

    // Document becomes [A(id=91), B(id=null)].
    const block = await firstBlock();
    await user.click(block);
    await user.keyboard('{End}');
    await user.keyboard('{Enter}');
    const blocks = (await screen.findAllByRole('textbox')).filter((el) => el.id.startsWith('block-')) as HTMLTextAreaElement[];
    await user.type(blocks[1], 'Second block');
    await waitFor(() => expect(updateBodies).toHaveLength(1), { timeout: 4000 });

    // While that save is open, reorder to [B, A] - so response position 0 is no longer block A.
    await user.click(screen.getByRole('button', { name: /Block options for Text block 2/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Move up/ }));

    firstSaveGate.release?.();
    await waitFor(() => expect(updateBodies.length).toBeGreaterThanOrEqual(2), { timeout: 4000 });

    // The follow-up save must carry each id on its own block: B (new id 500) first, A (91) second.
    const latest = updateBodies[updateBodies.length - 1].blocks as Array<Record<string, unknown>>;
    expect(latest.map((entry) => entry.content)).toEqual(['Second block', 'Walked through the callback contract.']);
    expect(latest[1].id).toBe(91);
    // Critically, no id may be claimed twice - that would make the diff write one row and strand
    // the other, cascade-deleting its task link.
    const ids = latest.map((entry) => entry.id).filter((id) => id !== null && id !== undefined);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(undefined);
  });

  it('Back waits for a save queued behind an in-flight one before navigating away', async () => {
    const releases: Array<() => void> = [];
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return jsonResponse(makeNote());
        updateBodies.push(JSON.parse(String(init?.body)));
        return new Promise<Response>((resolve) => {
          releases.push(() => resolve(new Response(JSON.stringify(makeNote()), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })));
        });
      },
    }));
    const user = userEvent.setup();
    renderNotePage();

    const title = await screen.findByLabelText('Note title');
    await user.type(title, 'A');
    await waitFor(() => expect(updateBodies).toHaveLength(1), { timeout: 4000 });

    // Type again while save #1 is still open, then immediately leave.
    await user.type(title, 'B');
    const backPromise = user.click(screen.getByRole('button', { name: 'Notes' }));

    // Save #1 is still open: nothing may navigate yet.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.getByTestId('location')).toHaveTextContent('/notes/7');

    // Let #1 land. The queued save for edit B is issued...
    releases[0]?.();
    await waitFor(() => expect(updateBodies.length).toBe(2), { timeout: 4000 });
    expect(updateBodies[1].title).toBe('PACI integration meetingAB');

    // ...and this is the crux: flush must still be waiting on it. Navigating here would strand
    // edit B on an unmounted component.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.getByTestId('location')).toHaveTextContent('/notes/7');

    releases[1]?.();
    await backPromise;
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/notes($|\?)/), { timeout: 4000 });
  });

  it('Back does not navigate away from work that failed to save', async () => {
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return jsonResponse(makeNote());
        return jsonResponse({ message: 'Upstream exploded' }, 500);
      },
    }));
    const user = userEvent.setup();
    renderNotePage();

    await user.type(await screen.findByLabelText('Note title'), '!');
    await screen.findByRole('alert', {}, { timeout: 4000 });

    await user.click(screen.getByRole('button', { name: 'Notes' }));

    // Still on the note, with the error and the user's text intact.
    expect(screen.getByTestId('location')).toHaveTextContent('/notes/7');
    expect(screen.getByLabelText('Note title')).toHaveValue('PACI integration meeting!');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('NotePage - creation and navigation', () => {
  it('opens a new note ready to type, without a metadata form first', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    renderNotePage('/notes/new');

    const title = await screen.findByLabelText('Note title');
    expect(title).toHaveValue('');
    expect(title).toHaveAttribute('placeholder', 'Untitled');
    expect(await firstBlock()).toHaveValue('');
    expect(screen.queryByLabelText('Note type')).not.toBeInTheDocument();
  });

  it('creates the note on first edit and swaps the URL to its real id', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage('/notes/new');

    await user.type(await screen.findByLabelText('Note title'), 'Q3 review');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/notes/42'), { timeout: 4000 });
    expect(updateBodies[0].title).toBe('Q3 review');
  });

  it('returns to the exact library view it was opened from', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage(`/notes/7?return=${encodeURIComponent('view=meetings&projectId=1&q=paci')}`);

    await user.click(await screen.findByRole('button', { name: 'Notes' }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      expect(location).toContain('/notes');
      expect(location).toContain('view=meetings');
      expect(location).toContain('projectId=1');
      expect(location).toContain('q=paci');
    });
  });

  it('offers a retry when the note itself cannot be loaded', async () => {
    vi.stubGlobal('fetch', baseFetchImpl({
      '/api/v1/notes/7': () => jsonResponse({ message: 'Gone' }, 500),
    }));
    renderNotePage();

    expect(await screen.findByText("Couldn't open this note")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});

describe('NotePage - properties', () => {
  it('saves a changed property without touching the document body', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    await user.click(await screen.findByRole('button', { name: /Edit note properties/ }));
    await user.selectOptions(await screen.findByLabelText('Note type'), 'DECISION');

    await waitFor(() => expect(updateBodies.length).toBeGreaterThan(0), { timeout: 4000 });
    const saved = updateBodies[updateBodies.length - 1];
    expect(saved.noteType).toBe('DECISION');
    expect(saved.body).toBe('Walked through the callback contract.');
  });

  it('edits tags and the linked task from the properties panel', async () => {
    vi.stubGlobal('fetch', baseFetchImpl());
    const user = userEvent.setup();
    renderNotePage();

    await user.click(await screen.findByRole('button', { name: /Edit note properties/ }));
    await user.clear(await screen.findByLabelText('Tags'));
    await user.type(screen.getByLabelText('Tags'), 'paci, backend');
    await user.selectOptions(screen.getByLabelText('Linked task'), '318');

    await waitFor(() => {
      const saved = updateBodies[updateBodies.length - 1];
      expect(saved?.tags).toEqual(['paci', 'backend']);
      expect(saved?.taskId).toBe(318);
    }, { timeout: 4000 });
  });
});

describe('NotePage - version restore (blocking review on #301)', () => {
  const VERSIONS = [
    { id: 55, noteId: 7, title: 'PACI integration meeting', body: 'Earlier draft of the callback contract.', contentType: 'PLAIN_TEXT', tags: ['paci'], createdAt: '2026-08-30T10:00:00Z' },
  ];

  const RESTORED_NOTE = makeNote({
    title: 'PACI integration meeting',
    body: 'Earlier draft of the callback contract.',
    blocks: [{ id: 91, noteId: 7, type: 'paragraph', content: 'Earlier draft of the callback contract.', position: 0, checked: false }],
  });

  /**
   * A note page wired for restore. The note GET answers with the pre-restore note until the restore
   * POST has actually resolved, which is what makes an eager re-hydration observable: reloading
   * before the server has restored anything reads back the old document.
   */
  function setUpRestore({ deferRestore = false, failRestore = false } = {}) {
    const state = { restored: false, noteGets: 0, releaseRestore: undefined as (() => void) | undefined };
    vi.stubGlobal('fetch', baseFetchImpl({
      '/restore': () => {
        if (failRestore) return jsonResponse({ message: 'Restore failed on the server' }, 500);
        const settle = () => {
          state.restored = true;
          return new Response(JSON.stringify(RESTORED_NOTE), { status: 200, headers: { 'content-type': 'application/json' } });
        };
        if (!deferRestore) return Promise.resolve(settle());
        return new Promise<Response>((resolve) => { state.releaseRestore = () => resolve(settle()); });
      },
      '/versions': () => jsonResponse(VERSIONS),
      '/api/v1/notes/7': (init) => {
        if ((init?.method ?? 'GET') !== 'GET') {
          updateBodies.push(JSON.parse(String(init?.body)));
          return jsonResponse(makeNote());
        }
        state.noteGets += 1;
        return jsonResponse(state.restored ? RESTORED_NOTE : makeNote());
      },
    }));
    vi.stubGlobal('confirm', vi.fn(() => true));
    return state;
  }

  async function openVersionHistory(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByLabelText('Note title');
    await user.click(screen.getByRole('button', { name: 'Version history' }));
    return within(await screen.findByRole('region', { name: 'Version history' }));
  }

  it('does not reload the document while the restore request is still in flight', async () => {
    const state = setUpRestore({ deferRestore: true });
    const user = userEvent.setup();
    renderNotePage();

    const panel = await openVersionHistory(user);
    const getsBeforeRestore = state.noteGets;
    await user.click(panel.getByRole('button', { name: 'Restore this version' }));

    // The restore has not resolved. Re-reading the note here would return the *pre-restore*
    // document and pin it as the editor's baseline for good, so nothing may be reloaded yet.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(state.noteGets).toBe(getsBeforeRestore);
    expect(screen.getByLabelText('Note title')).toHaveValue('PACI integration meeting');
    expect(await firstBlock()).toHaveValue('Walked through the callback contract.');

    state.releaseRestore?.();
    await waitFor(async () => expect(await firstBlock()).toHaveValue('Earlier draft of the callback contract.'), { timeout: 4000 });
  });

  it('shows the restored title, body and blocks once the restore has succeeded', async () => {
    setUpRestore();
    const user = userEvent.setup();
    renderNotePage();

    const panel = await openVersionHistory(user);
    await user.click(panel.getByRole('button', { name: 'Restore this version' }));

    await waitFor(async () => expect(await firstBlock()).toHaveValue('Earlier draft of the callback contract.'), { timeout: 4000 });
    expect(screen.getByLabelText('Note title')).toHaveValue('PACI integration meeting');
  });

  it('leaves the document untouched and surfaces the failure when a restore fails', async () => {
    setUpRestore({ failRestore: true });
    const user = userEvent.setup();
    renderNotePage();

    const panel = await openVersionHistory(user);
    await user.click(panel.getByRole('button', { name: 'Restore this version' }));

    await screen.findByRole('alert', {}, { timeout: 4000 });
    expect(screen.getByRole('alert')).toHaveTextContent(/This version could not be restored\./i);
    // The server's own words are kept, so the failure is explained rather than generic.
    expect(screen.getByRole('alert')).toHaveTextContent(/500/);
    // The document the user was looking at is still exactly what it was.
    expect(screen.getByLabelText('Note title')).toHaveValue('PACI integration meeting');
    expect(await firstBlock()).toHaveValue('Walked through the callback contract.');
  });

  it('does not autosave just because a successful restore changed the hydration baseline', async () => {
    setUpRestore();
    const user = userEvent.setup();
    renderNotePage();

    const panel = await openVersionHistory(user);
    await user.click(panel.getByRole('button', { name: 'Restore this version' }));
    await waitFor(async () => expect(await firstBlock()).toHaveValue('Earlier draft of the callback contract.'), { timeout: 4000 });

    // Well past the autosave debounce: re-hydration is a load, not an edit.
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(updateBodies).toHaveLength(0);
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
  });
});
