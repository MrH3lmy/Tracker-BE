import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiJson, isQueryError } from '../apiClient';
import { NoteEditorCanvas } from '../components/notes/editor/NoteEditorCanvas';
import { NotePageProperties, type NoteProperties } from '../components/notes/editor/NotePageProperties';
import { NoteSaveStatus } from '../components/notes/editor/NoteSaveStatus';
import { useNoteAutosave } from '../components/notes/editor/useNoteAutosave';
import {
  blocksFromNote,
  applyServerIds,
  blocksToPayload,
  bodyFromBlocks,
  makeBlock,
  serverIdsByBlockKey,
  type EditorBlock,
} from '../components/notes/editor/editorBlocks';
import { ConvertNoteToTaskDialog } from '../components/notes/ConvertNoteToTaskDialog';
import { emptyConvertDraft, type ConvertTaskDraft } from '../components/notes/convertTaskDraft';
import { NoteVersionHistoryPanel } from '../components/notes/NoteVersionHistoryPanel';
import { useNoteVersionHistory } from '../components/notes/useNoteVersionHistory';
import type { NoteRecord } from '../components/notes/noteTypes';
import { formatDate } from '../components/notes/notesPageHelpers';
import type { ProjectRecord } from '../components/projects/projectTypes';
import type { TaskRecord } from '../components/tasks/taskTypes';
import {
  useNoteCollectionsQuery,
  useNoteMutations,
  useNoteQuery,
  useProjectsQuery,
  useTasksQuery,
} from '../hooks/useApiQueries';
import { Button, EmptyState } from '../components/ui';
import { AlertTriangle, ArrowLeft, Loader2 } from '../components/ui/icons';

const NEW_NOTE_TITLE = 'Untitled';

interface NoteDocument {
  title: string;
  blocks: EditorBlock[];
  properties: NoteProperties;
}

function propertiesFromNote(note: NoteRecord): NoteProperties {
  return {
    projectId: note.projectId == null ? '' : String(note.projectId),
    noteType: note.noteType ?? 'GENERAL',
    collectionId: note.collectionId == null ? '' : String(note.collectionId),
    taskId: note.taskId == null ? '' : String(note.taskId),
    tags: note.tags?.join(', ') ?? '',
    contentType: note.contentType,
  };
}

/**
 * A note as a first-class editable page (issue #299 follow-up): `/notes/:id`.
 *
 * The document is the surface. Title and blocks are edited in place, properties sit quietly under
 * the title, and everything saves itself - `useNoteAutosave` owns the debounce, the strict
 * sequencing and the stale-response guard, and `NoteSaveStatus` is the only claim about safety.
 *
 * The library's filter state rides along in `?return=`, so Back from here lands on exactly the
 * `/notes` view the note was opened from rather than a blank global list.
 */
export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isNew = id === 'new';
  const noteId = isNew ? 0 : Number(id);
  const returnTo = searchParams.get('return');
  const backHref = returnTo ? `/notes?${returnTo}` : '/notes';

  const noteQuery = useNoteQuery(noteId, !isNew && Number.isFinite(noteId));
  const projectsQuery = useProjectsQuery();
  const collectionsQuery = useNoteCollectionsQuery();
  const tasksQuery = useTasksQuery('active');
  const { convertNoteToTask, restoreNoteVersion } = useNoteMutations();

  const projects = useMemo<ProjectRecord[]>(
    () => (Array.isArray(projectsQuery.data?.data) ? projectsQuery.data.data : []),
    [projectsQuery.data],
  );
  const collections = useMemo(
    () => (Array.isArray(collectionsQuery.data?.data) ? collectionsQuery.data.data : []),
    [collectionsQuery.data],
  );
  const tasks = useMemo<TaskRecord[]>(
    () => (Array.isArray(tasksQuery.data?.data) ? tasksQuery.data.data : []),
    [tasksQuery.data],
  );

  const note = (noteQuery.data?.ok ? (noteQuery.data.data as NoteRecord) : null) ?? null;

  const [document, setDocument] = useState<NoteDocument | null>(null);
  const [createdNoteId, setCreatedNoteId] = useState<number | null>(null);
  const [convertDraft, setConvertDraft] = useState<ConvertTaskDraft | null>(null);
  const [isScreenshotHintOpen, setIsScreenshotHintOpen] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const documentRef = useRef<NoteDocument | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  const effectiveNoteId = createdNoteId ?? (isNew ? null : noteId);

  /**
   * Hydrate exactly once per source, so an autosave response - which refetches the note - can
   * never re-seed the editor out from under the caret. `hydrationKey` changes only when a genuinely
   * different document should be loaded (a new note, a different id, or an explicit reload after a
   * version restore), and the state adjustment happens during render rather than in an effect so
   * the first paint already shows the document.
   */
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const hydrationKey = isNew ? `new-${reloadToken}` : note ? `note-${note.id}-${reloadToken}` : null;

  if (hydrationKey !== null && hydratedKey !== hydrationKey) {
    setHydratedKey(hydrationKey);
    setDocument(
      isNew
        ? {
            title: '',
            blocks: [makeBlock('paragraph')],
            properties: {
              projectId: searchParams.get('projectId')?.trim() ?? '',
              noteType: 'GENERAL',
              collectionId: '',
              taskId: searchParams.get('taskId')?.trim() ?? '',
              tags: '',
              contentType: 'PLAIN_TEXT',
            },
          }
        : { title: note!.title, blocks: blocksFromNote(note!), properties: propertiesFromNote(note!) },
    );
  }

  const versionHistory = useNoteVersionHistory({
    notes: note ? [note] : [],
    restoreNoteVersion,
    setForm: () => {},
    setDraftBlocks: () => {},
    setEditingNoteId: () => {},
    formatDate,
  });

  /**
   * One save. Returns a plain result rather than throwing so the autosave hook can render a
   * persistent error state instead of an unhandled rejection.
   */
  const save = useCallback(
    async (snapshot: NoteDocument) => {
      const payload = {
        title: snapshot.title.trim() || NEW_NOTE_TITLE,
        body: bodyFromBlocks(snapshot.blocks),
        contentType: snapshot.properties.contentType,
        taskId: snapshot.properties.taskId ? Number(snapshot.properties.taskId) : null,
        collectionId: snapshot.properties.collectionId ? Number(snapshot.properties.collectionId) : null,
        projectId: snapshot.properties.projectId ? Number(snapshot.properties.projectId) : null,
        noteType: snapshot.properties.noteType,
        tags: snapshot.properties.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        blocks: blocksToPayload(snapshot.blocks),
        autosave: true,
      };

      if (effectiveNoteId === null) {
        const result = await apiJson<NoteRecord>('POST', '/api/v1/notes', payload);
        if (!result.ok || !result.data) return { ok: false, message: result.error?.message ?? 'Could not create the note.' };
        const created = result.data;
        setCreatedNoteId(created.id);
        // Replace the URL so a reload lands on the real note, without adding a history entry
        // between the library and this page.
        navigate(`/notes/${created.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`, { replace: true });
        const createdIds = serverIdsByBlockKey(snapshot.blocks, created.blocks);
        setDocument((current) => (current ? { ...current, blocks: applyServerIds(current.blocks, createdIds) } : current));
        return { ok: true };
      }

      const result = await apiJson<NoteRecord>('PUT', `/api/v1/notes/${effectiveNoteId}`, payload);
      if (!result.ok || !result.data) return { ok: false, message: result.error?.message ?? 'Could not save the note.' };
      const saved = result.data;
      // Adopt server-assigned block ids only - never server content, which would clobber whatever
      // was typed while this request was in flight. Ids are correlated against `snapshot`, the
      // blocks this request actually sent, and merged by client key, so a reorder or insert during
      // the request cannot pin an id onto the wrong block.
      const savedIds = serverIdsByBlockKey(snapshot.blocks, saved.blocks);
      setDocument((current) => (current ? { ...current, blocks: applyServerIds(current.blocks, savedIds) } : current));
      return { ok: true };
    },
    [effectiveNoteId, navigate, returnTo],
  );

  const { status, errorMessage, flush, retry } = useNoteAutosave<NoteDocument>({
    snapshot: document as NoteDocument,
    save,
    enabled: document !== null,
    // Hydration (and re-hydration after a version restore) establishes the clean baseline instead
    // of registering as an edit, so opening a note never autosaves it on its own.
    baselineKey: hydratedKey,
  });

  // Refs are written in an effect, never during render.
  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const patchDocument = useCallback((patch: Partial<NoteDocument>) => {
    setDocument((current) => (current ? { ...current, ...patch } : current));
  }, []);

  /**
   * Restore is only allowed to replace what is on screen **after** the server confirms it.
   *
   * Re-hydrating eagerly (bumping the reload token while the restore request was still in flight)
   * could read the note back before it had been restored and then pin that pre-restore document as
   * the editor's baseline - leaving the page showing the old content even though the restore had
   * succeeded. So: await the restore, await the refetch, and only then change the hydration key.
   * A failure leaves the current document exactly as it was and surfaces the reason.
   */
  const restoreSelectedVersion = useCallback(async () => {
    setRestoreError(null);
    const outcome = await versionHistory.restoreSelectedVersion();
    if (outcome.status === 'cancelled') return;
    if (outcome.status === 'failed') {
      setRestoreError(outcome.message);
      return;
    }
    const refreshed = await noteQuery.refetch();
    if (!refreshed.data?.ok) {
      setRestoreError('The version was restored, but this page could not be reloaded. Reload to see it.');
      return;
    }
    // The query cache now holds the restored note, so a new hydration key re-seeds the editor from
    // it. `useNoteAutosave` adopts a snapshot arriving with a new baseline key as clean, so this
    // does not register as an edit and does not trigger a save.
    setReloadToken((token) => token + 1);
  }, [noteQuery, versionHistory]);

  const goBack = useCallback(async () => {
    // `flush` resolves only once the server has the revision that was current when it was called,
    // so a queued save behind an in-flight one is drained before we unmount. If it could not be
    // saved we stay put: the persistent error is on screen and the user's newest edit is still in
    // the document rather than discarded by navigating.
    const saved = await flush();
    if (!saved) return;
    navigate(backHref);
  }, [backHref, flush, navigate]);

  useEffect(() => {
    if (isNew && titleRef.current) titleRef.current.focus();
  }, [isNew]);

  if (!isNew && noteQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-muted" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading note…
      </p>
    );
  }

  if (!isNew && isQueryError(noteQuery.data)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't open this note"
        description={noteQuery.data?.error?.message ?? 'The note could not be loaded.'}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="primary" onClick={() => void noteQuery.refetch()} disabled={noteQuery.isFetching}>
              {noteQuery.isFetching ? 'Retrying…' : 'Try again'}
            </Button>
            <Button size="sm" onClick={() => navigate(backHref)}>Back to Notes</Button>
          </div>
        }
      />
    );
  }

  if (!document) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => void goBack()}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Notes
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <NoteSaveStatus status={status} errorMessage={errorMessage} onRetry={() => void retry()} />
          {effectiveNoteId !== null && note ? (
            <Button size="sm" onClick={() => versionHistory.openVersionHistory(note)}>
              Version history
            </Button>
          ) : null}
        </div>
      </div>

      {/* The writing surface: an editable page, not a form. */}
      <article className="mx-auto w-full max-w-3xl">
        <label className="sr-only" htmlFor="notePageTitle">Note title</label>
        <textarea
          id="notePageTitle"
          ref={titleRef}
          rows={1}
          value={document.title}
          placeholder={NEW_NOTE_TITLE}
          onChange={(event) => {
            patchDocument({ title: event.target.value });
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const firstBlock = document.blocks[0];
            if (firstBlock) window.document.getElementById(`block-${firstBlock.key}`)?.focus();
          }}
          className="w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-1 text-3xl font-bold tracking-tight text-fg outline-none placeholder:text-fg-subtle"
        />

        <NotePageProperties
          properties={document.properties}
          onChange={(patch) => patchDocument({ properties: { ...document.properties, ...patch } })}
          projects={projects}
          collections={collections}
          tasks={tasks}
          note={note}
        />

        <div className="mt-4">
          <NoteEditorCanvas
            blocks={document.blocks}
            onChange={(blocks) => patchDocument({ blocks })}
            taskLinks={note?.taskLinks ?? []}
            onConvertBlockToTask={async (block) => {
              // A block only has an id once it has been saved, so flush first - otherwise a
              // freshly typed action item could not carry noteBlockId and would lose the
              // idempotency guarantee.
              if (block.id === null) await flush();
              const saved = documentRef.current?.blocks.find((candidate) => candidate.key === block.key);
              if (effectiveNoteId === null || !saved?.id) return;
              setConvertDraft(emptyConvertDraft(effectiveNoteId, saved.content || document.title, saved.id));
            }}
            onRequestScreenshot={() => setIsScreenshotHintOpen(true)}
          />
        </div>
      </article>

      {versionHistory.versionHistoryNoteId !== null ? (
        <div className="mx-auto w-full max-w-3xl">
          <NoteVersionHistoryPanel
            versionHistoryNoteId={versionHistory.versionHistoryNoteId}
            versionHistoryNote={versionHistory.versionHistoryNote}
            noteVersionsQuery={versionHistory.noteVersionsQuery}
            noteVersions={versionHistory.noteVersions}
            selectedVersion={versionHistory.selectedVersion}
            setSelectedVersionId={versionHistory.setSelectedVersionId}
            setVersionHistoryNoteId={versionHistory.setVersionHistoryNoteId}
            restoreNoteVersion={restoreNoteVersion}
            restoreSelectedVersion={restoreSelectedVersion}
          />
          {restoreError ? (
            <p role="alert" className="mt-2 text-sm font-medium text-critical">
              {restoreError}
            </p>
          ) : null}
        </div>
      ) : null}

      <ConvertNoteToTaskDialog
        draft={convertDraft}
        onChange={setConvertDraft}
        onClose={() => setConvertDraft(null)}
        isPending={convertNoteToTask.isPending}
        availableTasks={tasks}
        onSubmit={() => {
          if (!convertDraft) return;
          convertNoteToTask.mutate(
            {
              noteId: convertDraft.noteId,
              body: {
                title: convertDraft.title,
                selectedText: convertDraft.sourceText,
                dueDate: convertDraft.dueDate || null,
                status: convertDraft.status || null,
                area: convertDraft.area || null,
                effort: convertDraft.effort || null,
                parentTaskId: convertDraft.parentTaskId ? Number(convertDraft.parentTaskId) : null,
                noteBlockId: convertDraft.noteBlockId ?? null,
              },
            },
            {
              onSuccess: (result) => {
                if (!result.ok) return;
                setConvertDraft(null);
                void noteQuery.refetch();
              },
            },
          );
        }}
      />

      {isScreenshotHintOpen ? (
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-line bg-inset/40 p-3" role="status">
          <p className="text-sm text-fg-muted">
            Paste an image straight into a block, or attach one from this note's row in the library.
          </p>
          <Button size="sm" className="mt-2" onClick={() => setIsScreenshotHintOpen(false)}>Got it</Button>
        </div>
      ) : null}
    </div>
  );
}
