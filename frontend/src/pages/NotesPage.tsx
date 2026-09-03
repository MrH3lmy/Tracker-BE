import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isQueryError } from "../apiClient";
import { ConvertNoteToTaskDialog } from "../components/notes/ConvertNoteToTaskDialog";
import { emptyConvertDraft, type ConvertTaskDraft } from "../components/notes/convertTaskDraft";
import { NotesContextBanner } from "../components/notes/NotesContextBanner";
import { NotesResultToolbar } from "../components/notes/NotesResultToolbar";
import { NotesResultView } from "../components/notes/NotesResultView";
import { NotesSearchBar } from "../components/notes/NotesSearchBar";
import { NotesState } from "../components/notes/NotesState";
import { NotesWorkspaceHeader } from "../components/notes/NotesWorkspaceHeader";
import { NotesWorkspaceNav, type NotesSavedView } from "../components/notes/NotesWorkspaceNav";
import { NoteVersionHistoryPanel } from "../components/notes/NoteVersionHistoryPanel";
import { ScreenshotCropOverlay } from "../components/notes/ScreenshotCropOverlay";
import { useNoteVersionHistory } from "../components/notes/useNoteVersionHistory";
import { useNoteScreenshots } from "../components/notes/useNoteScreenshots";
import { useNotesWorkspace } from "../components/notes/useNotesWorkspace";
import { findSmartView } from "../components/notes/notesSmartViews";
import { toNotesQueryFilters } from "../components/notes/notesFilters";
import type { NoteBlockRecord, NoteRecord } from "../components/notes/noteTypes";
import type { ProjectRecord } from "../components/projects/projectTypes";
import { EMPTY_FORM, formatDate, getStickyNoteNumber, type NoteFormState } from "../components/notes/notesPageHelpers";
import type { TaskRecord } from "../components/tasks/taskTypes";
import {
  useNoteCollectionsQuery,
  useNoteMutations,
  useNoteSavedViewsQuery,
  useNotesQuery,
  useProjectsQuery,
  useTasksQuery,
} from "../hooks/useApiQueries";
import { Button, Drawer } from "../components/ui";
import { PanelLeft } from "../components/ui/icons";

const NOTES_PAGE_SIZE_STEP = 100;
const NOTES_PAGE_SIZE_MAX = 200;

/**
 * The Notes knowledge library (issue #299).
 *
 * Discovery only: `useNotesWorkspace` owns filters, smart views, sort and URL sync, and every note
 * opens as a page at `/notes/:id` rather than in a drawer. The current filter query string rides
 * along as `?return=`, so Back from a note lands on exactly this view again.
 */
export function NotesPage() {
  const navigate = useNavigate();
  const collectionsQuery = useNoteCollectionsQuery();
  const savedViewsQuery = useNoteSavedViewsQuery();
  const tasksQuery = useTasksQuery("active");
  const projectsQuery = useProjectsQuery();

  const collections = useMemo(
    () => (Array.isArray(collectionsQuery.data?.data) ? collectionsQuery.data.data : []),
    [collectionsQuery.data],
  );
  const savedViews = useMemo<NotesSavedView[]>(
    () => (Array.isArray(savedViewsQuery.data?.data) ? (savedViewsQuery.data.data as NotesSavedView[]) : []),
    [savedViewsQuery.data],
  );
  const projects = useMemo<ProjectRecord[]>(
    () => (Array.isArray(projectsQuery.data?.data) ? projectsQuery.data.data : []),
    [projectsQuery.data],
  );
  const availableTasks = useMemo<TaskRecord[]>(
    () => (Array.isArray(tasksQuery.data?.data) ? tasksQuery.data.data : []),
    [tasksQuery.data],
  );

  const {
    linkedTaskId, filters, patchFilters, searchInput, setSearchInput, smartViewId, selectSmartView,
    selectCollection, applySavedView, clearFilters, currentSavedViewPayload, viewMode, setViewMode,
    activeChips, advancedFilterCount, hasActiveFilters, hasFiltersBeyondSmartView,
  } = useNotesWorkspace({ collections, projects });

  const [notesPageSize, setNotesPageSize] = useState(100);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [appliedSavedViewId, setAppliedSavedViewId] = useState<number | null>(null);
  const [convertDraft, setConvertDraft] = useState<ConvertTaskDraft | null>(null);
  /**
   * Not an editor. `useNoteScreenshots` needs a note-shaped draft to build a "capture area" note
   * from, plus a target id when attaching to an existing note's row. Normal editing lives on the
   * note page at /notes/:id.
   */
  const [captureDraft, setCaptureDraft] = useState<NoteFormState>(EMPTY_FORM);
  const [captureTargetNoteId, setCaptureTargetNoteId] = useState<number | null>(null);
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const newNoteButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const notesQuery = useNotesQuery(toNotesQueryFilters(filters, linkedTaskId, notesPageSize));
  const {
    createNote, updateNote, deleteNote, uploadScreenshot, convertNoteToTask,
    createTaskLink, deleteTaskLink, restoreNoteVersion, createSavedView, deleteSavedView,
  } = useNoteMutations();

  const taskTitleById = useMemo(() => new Map(availableTasks.map((task) => [task.id, task.title])), [availableTasks]);
  const projectTitleById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  const notes = useMemo<NoteRecord[]>(() => {
    const records: NoteRecord[] = Array.isArray(notesQuery.data?.data) ? notesQuery.data.data : [];
    if (!linkedTaskId) return records;
    return [...records].sort((first, second) => {
      const orderDelta = getStickyNoteNumber(first) - getStickyNoteNumber(second);
      return orderDelta === 0 ? first.id - second.id : orderDelta;
    });
  }, [linkedTaskId, notesQuery.data]);

  const {
    versionHistoryNoteId, setVersionHistoryNoteId, setSelectedVersionId, noteVersionsQuery,
    noteVersions, selectedVersion, versionHistoryNote, openVersionHistory, restoreSelectedVersion,
  } = useNoteVersionHistory({
    notes,
    restoreNoteVersion,
    setForm: setCaptureDraft,
    setDraftBlocks: () => {},
    setEditingNoteId: setCaptureTargetNoteId,
    formatDate,
  });

  const notesQueryErrorMessage =
    notesQuery.data && !notesQuery.data.ok
      ? notesQuery.data.error?.message ??
        (notesQuery.data.status ? `Request failed with status ${notesQuery.data.status}.` : notesQuery.data.error?.details ?? "Request failed.")
      : undefined;

  const isBusy =
    createNote.isPending || updateNote.isPending || deleteNote.isPending || convertNoteToTask.isPending ||
    createTaskLink.isPending || deleteTaskLink.isPending || restoreNoteVersion.isPending;
  const screenshotNoteTaskId = linkedTaskId || captureDraft.taskId.trim();

  const {
    attachmentCaptions, setAttachmentCaptions, screenshotMessages, screenshotNoteMessage,
    pendingClipboardImages, capturingNoteId, isCreatingScreenshotNote, cropOverlay,
    setScreenshotFileInput, cropImageRef, isUploadPending, isCapturePending, handleScreenshotNote,
    handleTakeScreenshot, handleScreenshotSubmit, cancelCropOverlay, confirmCropOverlay,
    handleCropPointerDown, handleCropPointerMove, handleCropPointerUp, getNormalizedSelection,
  } = useNoteScreenshots({
    activeForm: linkedTaskId && captureDraft.taskId.trim() === "" ? { ...captureDraft, taskId: linkedTaskId } : captureDraft,
    setForm: setCaptureDraft,
    editingNoteId: captureTargetNoteId,
    setEditingNoteId: setCaptureTargetNoteId,
    isBusy,
    screenshotNoteTaskId,
    noteBodyRef,
    createNote,
    updateNote,
    uploadScreenshot,
    refetchNotes: notesQuery.refetch,
  });

  const activeSmartView = findSmartView(smartViewId);
  const activeProjectName = filters.projectId ? projectTitleById.get(Number(filters.projectId)) : undefined;
  const linkedTaskTitle = linkedTaskId ? taskTitleById.get(Number(linkedTaskId)) : undefined;

  /** The library view a note page should return to - keeps filters, search and smart view. */
  const returnQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (smartViewId && smartViewId !== "all") params.set("view", smartViewId);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.collectionId) params.set("collectionId", filters.collectionId);
    if (filters.noteType !== "all") params.set("type", filters.noteType);
    if (linkedTaskId) params.set("taskId", linkedTaskId);
    return params.toString();
  }, [filters.collectionId, filters.noteType, filters.projectId, filters.q, linkedTaskId, smartViewId]);

  const openNote = useCallback(
    (note: NoteRecord) => {
      navigate(`/notes/${note.id}${returnQuery ? `?return=${encodeURIComponent(returnQuery)}` : ""}`);
    },
    [navigate, returnQuery],
  );

  const openNewNote = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (linkedTaskId) params.set("taskId", linkedTaskId);
    if (returnQuery) params.set("return", returnQuery);
    const query = params.toString();
    navigate(`/notes/new${query ? `?${query}` : ""}`);
  }, [filters.projectId, linkedTaskId, navigate, returnQuery]);

  const saveCurrentView = () => {
    const name = window.prompt("Saved view name");
    if (!name?.trim()) return;
    createSavedView.mutate({ name: name.trim(), ...currentSavedViewPayload });
  };

  /**
   * Converting a persisted structured action item from a result card - passes the real
   * `noteBlockId` so the backend's idempotent (note, block) conversion applies (issues #287/#296).
   */
  const openConvertBlockModal = (note: NoteRecord, block: NoteBlockRecord) => {
    setConvertDraft(emptyConvertDraft(note.id, block.content ?? note.title, block.id));
  };

  const copyBody = useCallback((note: NoteRecord) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .writeText(note.body)
      .then(() => {
        setCopiedNoteId(note.id);
        window.setTimeout(() => setCopiedNoteId((current) => (current === note.id ? null : current)), 1600);
      })
      .catch(() => setCopiedNoteId(null));
  }, []);

  const workspaceNav = (onNavigate?: () => void) => (
    <NotesWorkspaceNav
      smartViewId={smartViewId}
      onSelectSmartView={(view) => { setAppliedSavedViewId(null); selectSmartView(view); }}
      collections={collections}
      collectionFilter={filters.collectionId}
      onSelectCollection={(collectionId) => { setAppliedSavedViewId(null); selectCollection(collectionId); }}
      savedViews={savedViews}
      appliedSavedViewId={appliedSavedViewId}
      onApplySavedView={(view) => { setAppliedSavedViewId(view.id); applySavedView(view); }}
      onDeleteSavedView={(view) => { if (window.confirm(`Delete saved view "${view.name}"?`)) deleteSavedView.mutate(view.id); }}
      onSaveCurrentView={saveCurrentView}
      isSavingView={createSavedView.isPending}
      onNavigate={onNavigate}
    />
  );

  const isTruncated = !notesQuery.isLoading && notes.length >= notesPageSize;

  return (
    <div className="flex flex-col gap-4" aria-busy={isBusy}>
      <NotesWorkspaceHeader
        canCaptureAreaNote={Boolean(screenshotNoteTaskId)}
        isBusy={isBusy}
        isUploadPending={isUploadPending}
        isCapturePending={isCapturePending}
        isCreatingScreenshotNote={isCreatingScreenshotNote}
        isReloading={notesQuery.isFetching}
        onCaptureAreaNote={() => void handleScreenshotNote()}
        onNewNote={openNewNote}
        onNewFromTemplate={openNewNote}
        onReload={() => void notesQuery.refetch()}
        newNoteButtonRef={newNoteButtonRef}
      />

      <NotesContextBanner
        projectId={filters.projectId || undefined}
        projectName={activeProjectName}
        linkedTaskId={linkedTaskId || undefined}
        linkedTaskTitle={linkedTaskTitle}
        onClearProject={() => patchFilters({ projectId: "" })}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-w-0 rounded-xl border border-line bg-card p-3 lg:sticky lg:top-4 lg:block">
          {workspaceNav()}
        </aside>

        <section className="flex min-w-0 flex-col gap-4" aria-label="Notes explorer">
          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-card p-4 sm:p-5">
            <div className="lg:hidden">
              <Button onClick={() => setIsMobileNavOpen(true)} aria-haspopup="dialog">
                <PanelLeft className="h-4 w-4" aria-hidden />
                Browse {activeSmartView ? `· ${activeSmartView.label}` : "collections"}
              </Button>
            </div>

            <NotesSearchBar
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              filters={filters}
              onPatchFilters={(patch) => { setAppliedSavedViewId(null); patchFilters(patch); }}
              collections={collections}
              projects={projects}
              activeChips={activeChips}
              advancedFilterCount={advancedFilterCount}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={() => { setAppliedSavedViewId(null); clearFilters(); }}
              searchInputRef={searchInputRef}
            />
          </div>

          {screenshotNoteMessage ? (
            <p
              className={screenshotNoteMessage.kind === "error" ? "text-sm text-critical" : "text-sm text-fg-muted"}
              role={screenshotNoteMessage.kind === "error" ? "alert" : "status"}
            >
              {screenshotNoteMessage.text}
            </p>
          ) : null}
          {pendingClipboardImages.length > 0 ? (
            <p className="text-sm text-fg-muted" role="status">
              {pendingClipboardImages.length} pasted screenshot(s) waiting to upload.
            </p>
          ) : null}

          <NoteVersionHistoryPanel
            versionHistoryNoteId={versionHistoryNoteId}
            versionHistoryNote={versionHistoryNote}
            noteVersionsQuery={noteVersionsQuery}
            noteVersions={noteVersions}
            selectedVersion={selectedVersion}
            setSelectedVersionId={setSelectedVersionId}
            setVersionHistoryNoteId={setVersionHistoryNoteId}
            restoreNoteVersion={restoreNoteVersion}
            restoreSelectedVersion={restoreSelectedVersion}
          />

          <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card p-4 sm:p-5">
            <h3 className="sr-only">Note results</h3>
            <NotesResultToolbar
              loadedCount={notes.length}
              isTruncated={isTruncated}
              isFetching={notesQuery.isFetching && !notesQuery.isLoading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={filters.sortBy}
              onSortByChange={(sortBy) => patchFilters({ sortBy })}
              sortDirection={filters.sortDirection}
              onSortDirectionChange={(sortDirection) => patchFilters({ sortDirection })}
            />

            <NotesState
              isLoading={notesQuery.isLoading}
              isError={isQueryError(notesQuery.data)}
              isEmpty={!notesQuery.isLoading && notes.length === 0}
              hasActiveFilters={hasActiveFilters}
              hasFiltersBeyondSmartView={hasFiltersBeyondSmartView}
              errorMessage={notesQueryErrorMessage}
              smartView={activeSmartView}
              onClearFilters={clearFilters}
              onNewNote={openNewNote}
              onRetry={() => void notesQuery.refetch()}
              isRetrying={notesQuery.isFetching}
            />

            {notes.length > 0 ? (
              <NotesResultView
                viewMode={viewMode}
                notes={notes}
                projectTitleById={projectTitleById}
                taskTitleById={taskTitleById}
                copiedNoteId={copiedNoteId}
                sortBy={filters.sortBy}
                onOpen={openNote}
                onCopy={copyBody}
                onVersionHistory={openVersionHistory}
                onConvertBlock={openConvertBlockModal}
                onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)}
                onScreenshotSubmit={handleScreenshotSubmit}
                screenshotMessages={screenshotMessages}
                attachmentCaptions={attachmentCaptions}
                onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))}
                screenshotInputRef={(noteId, element) => setScreenshotFileInput(noteId, element)}
                isUploadPending={isUploadPending}
                isCapturePending={isCapturePending}
                capturingNoteId={capturingNoteId}
              />
            ) : null}

            {isTruncated && notesPageSize < NOTES_PAGE_SIZE_MAX ? (
              <div className="flex justify-center">
                <Button
                  onClick={() => setNotesPageSize((current) => Math.min(current + NOTES_PAGE_SIZE_STEP, NOTES_PAGE_SIZE_MAX))}
                  disabled={notesQuery.isFetching}
                >
                  {notesQuery.isFetching ? "Loading..." : "Load more notes"}
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Drawer
        open={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
        title="Browse notes"
        description="Smart views, collections and saved views."
      >
        {workspaceNav(() => setIsMobileNavOpen(false))}
      </Drawer>

      <ConvertNoteToTaskDialog
        draft={convertDraft}
        onChange={setConvertDraft}
        onClose={() => setConvertDraft(null)}
        isPending={convertNoteToTask.isPending}
        availableTasks={availableTasks}
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
            { onSuccess: (result) => { if (result.ok) setConvertDraft(null); } },
          );
        }}
      />

      <ScreenshotCropOverlay
        cropOverlay={cropOverlay}
        cropImageRef={cropImageRef}
        getNormalizedSelection={getNormalizedSelection}
        cancelCropOverlay={cancelCropOverlay}
        confirmCropOverlay={confirmCropOverlay}
        handleCropPointerDown={handleCropPointerDown}
        handleCropPointerMove={handleCropPointerMove}
        handleCropPointerUp={handleCropPointerUp}
      />
    </div>
  );
}
