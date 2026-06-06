import { useMemo, useState, type FormEvent } from 'react';
import { QueryState } from '../components/QueryState';
import type { NoteContentType, NoteRecord } from '../components/notes/noteTypes';
import { latestResult, useNoteMutations, useNotesQuery } from '../hooks/useApiQueries';

const NOTE_CONTENT_TYPES: NoteContentType[] = ['PLAIN_TEXT', 'MARKDOWN', 'SHELL_COMMANDS', 'XML', 'JSON'];
const EMPTY_FORM: NoteFormState = { title: '', contentType: 'PLAIN_TEXT', taskId: '', body: '' };

interface NoteFormState {
  title: string;
  contentType: NoteContentType;
  taskId: string;
  body: string;
}

function humanizeContentType(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function noteToForm(note: NoteRecord): NoteFormState {
  return {
    title: note.title,
    contentType: note.contentType,
    taskId: note.taskId == null ? '' : String(note.taskId),
    body: note.body,
  };
}

function buildPayload(form: NoteFormState) {
  const trimmedTaskId = form.taskId.trim();
  return {
    title: form.title.trim(),
    contentType: form.contentType,
    taskId: trimmedTaskId ? Number(trimmedTaskId) : null,
    body: form.body,
  };
}

export function NotesPage() {
  const [search, setSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<NoteContentType | 'all'>('all');
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);

  const notesQuery = useNotesQuery({ q: search, contentType: contentTypeFilter });
  const { createNote, updateNote, deleteNote } = useNoteMutations();
  const latestMutationResult = latestResult(createNote.data, updateNote.data, deleteNote.data);
  const notes = useMemo(() => notesQuery.data?.data ?? [], [notesQuery.data]);
  const isBusy = createNote.isPending || updateNote.isPending || deleteNote.isPending;
  const canSubmit = form.title.trim().length > 0 && form.body.trim().length > 0 && !isBusy;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingNoteId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = buildPayload(form);
    if (editingNoteId === null) {
      createNote.mutate(payload, { onSuccess: (result) => { if (result.ok) resetForm(); } });
      return;
    }

    updateNote.mutate({ id: editingNoteId, body: payload }, { onSuccess: (result) => { if (result.ok) resetForm(); } });
  };

  const copyBody = (note: NoteRecord) => {
    if (!navigator.clipboard) return;

    void navigator.clipboard.writeText(note.body).then(() => {
      setCopiedNoteId(note.id);
      window.setTimeout(() => setCopiedNoteId((current) => (current === note.id ? null : current)), 1600);
    }).catch(() => setCopiedNoteId(null));
  };

  return (
    <div className="page-pattern notes-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Knowledge base</p>
          <h2>Notes</h2>
          <p>Capture searchable task notes, commands, JSON snippets, and reference material.</p>
        </div>
        <button type="button" className="button-primary" onClick={resetForm} disabled={isBusy || editingNoteId === null}>
          New note
        </button>
      </header>

      <section className="page-card main-content-card" aria-labelledby="notes-filters-title">
        <div className="section-header">
          <div>
            <h3 id="notes-filters-title">Browse notes</h3>
            <p className="muted">Search note titles and bodies, then narrow by content type.</p>
          </div>
          <button type="button" className="secondary-action" onClick={() => notesQuery.refetch()} disabled={notesQuery.isFetching}>
            {notesQuery.isFetching ? 'Loading...' : 'Reload notes'}
          </button>
        </div>

        <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
          <label className="field-stack" htmlFor="noteSearch" style={{ flex: '1 1 18rem' }}>
            <span>Search</span>
            <input
              id="noteSearch"
              type="search"
              value={search}
              placeholder="Search title or body"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="field-stack" htmlFor="noteContentTypeFilter" style={{ flex: '0 1 16rem' }}>
            <span>Content type</span>
            <select id="noteContentTypeFilter" value={contentTypeFilter} onChange={(event) => setContentTypeFilter(event.target.value as NoteContentType | 'all')}>
              <option value="all">All types</option>
              {NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}
            </select>
          </label>
        </div>

        <QueryState
          isLoading={notesQuery.isLoading}
          isError={Boolean(notesQuery.data && !notesQuery.data.ok)}
          isEmpty={!notesQuery.isLoading && notes.length === 0}
          emptyMessage="No notes match the current filters."
        />

        <div className="stacked-list" aria-label="Notes list">
          {notes.map((note) => (
            <article key={note.id} className="panel" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
              <div className="section-header">
                <div>
                  <p className="eyebrow">{humanizeContentType(note.contentType)}</p>
                  <h3>{note.title}</h3>
                  <p className="muted">Task {note.taskId ?? 'none'} · Updated {formatDate(note.updatedAt)}</p>
                </div>
                <div className="row compact-row">
                  <button type="button" onClick={() => copyBody(note)}>{copiedNoteId === note.id ? 'Copied' : 'Copy body'}</button>
                  <button type="button" onClick={() => { setEditingNoteId(note.id); setForm(noteToForm(note)); }}>Edit</button>
                  <button type="button" onClick={() => deleteNote.mutate(note.id)} disabled={isBusy}>Delete</button>
                </div>
              </div>
              <pre className="text-block" style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{note.body}</pre>
            </article>
          ))}
        </div>
      </section>

      <section className="page-card main-content-card" aria-labelledby="note-form-title" style={{ marginTop: 'var(--space-6)' }}>
        <div className="section-header">
          <div>
            <h3 id="note-form-title">{editingNoteId === null ? 'Create note' : 'Edit note'}</h3>
            <p className="muted">Notes require a title, content type, and body. Task IDs are optional.</p>
          </div>
          {editingNoteId !== null && <button type="button" onClick={resetForm} disabled={isBusy}>Cancel edit</button>}
        </div>

        <form onSubmit={handleSubmit} className="config-panel">
          <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <label className="field-stack" htmlFor="noteTitle" style={{ flex: '1 1 18rem' }}>
              <span>Title</span>
              <input id="noteTitle" value={form.title} maxLength={255} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label className="field-stack" htmlFor="noteContentType" style={{ flex: '0 1 16rem' }}>
              <span>Content type</span>
              <select id="noteContentType" value={form.contentType} onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as NoteContentType }))}>
                {NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}
              </select>
            </label>
            <label className="field-stack" htmlFor="noteTaskId" style={{ flex: '0 1 12rem' }}>
              <span>Task ID (optional)</span>
              <input id="noteTaskId" type="number" min="1" value={form.taskId} onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))} />
            </label>
          </div>

          <label className="field-stack" htmlFor="noteBody">
            <span>Body</span>
            <textarea
              id="noteBody"
              className="text-block"
              rows={12}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              required
            />
          </label>

          <div className="save-bar">
            <div>
              <strong>{editingNoteId === null ? 'Ready to create' : `Editing note #${editingNoteId}`}</strong>
              <p className="muted">Uses the shared API client against <code>/api/v1/notes</code>.</p>
            </div>
            <button type="submit" className="button-primary" disabled={!canSubmit}>{isBusy ? 'Saving...' : editingNoteId === null ? 'Create note' : 'Save note'}</button>
          </div>
        </form>

        <QueryState
          isLoading={false}
          isError={Boolean(latestMutationResult && !latestMutationResult.ok)}
          isEmpty={false}
          successMessage={latestMutationResult?.ok ? 'Note request completed successfully.' : undefined}
        />
      </section>
    </div>
  );
}
