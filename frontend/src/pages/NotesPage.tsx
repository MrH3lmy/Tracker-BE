import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { isQueryError } from "../apiClient";
import { CreateNoteDrawer } from "../components/notes/CreateNoteDrawer";
import { NotesContextBanner } from "../components/notes/NotesContextBanner";
import { NotesResultToolbar } from "../components/notes/NotesResultToolbar";
import { NotesResultView } from "../components/notes/NotesResultView";
import { NotesSearchBar } from "../components/notes/NotesSearchBar";
import { NotesState } from "../components/notes/NotesState";
import { NotesWorkspaceHeader } from "../components/notes/NotesWorkspaceHeader";
import { NotesWorkspaceNav, type NotesSavedView } from "../components/notes/NotesWorkspaceNav";
import { NoteVersionHistoryPanel } from "../components/notes/NoteVersionHistoryPanel";
import { ScreenshotCropOverlay } from "../components/notes/ScreenshotCropOverlay";
import { blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "../components/notes/NoteBlockEditor";
import { useNoteVersionHistory } from "../components/notes/useNoteVersionHistory";
import { useNoteScreenshots } from "../components/notes/useNoteScreenshots";
import { useNotesWorkspace } from "../components/notes/useNotesWorkspace";
import { findSmartView } from "../components/notes/notesSmartViews";
import { toNotesQueryFilters } from "../components/notes/notesFilters";
import type {
  NoteAiAction,
  NoteAiGenerationRecord,
  NoteBlockRecord,
  NoteRecord,
  NoteTemplateRecord,
} from "../components/notes/noteTypes";
import type { ProjectRecord } from "../components/projects/projectTypes";
import {
  buildNotePayload,
  EMPTY_FORM,
  formatDate,
  getStickyNoteNumber,
  noteToForm,
  type NoteFormState,
} from "../components/notes/notesPageHelpers";
import type { TaskRecord } from "../components/tasks/taskTypes";
import {
  latestResult,
  useNoteCollectionsQuery,
  useNoteAiGenerationsQuery,
  useNoteMutations,
  useNoteTemplatesQuery,
  useNoteSavedViewsQuery,
  useNotesQuery,
  useProjectsQuery,
  useSettingsQuery,
  useTasksQuery,
} from "../hooks/useApiQueries";
import { Button, Dialog, Drawer, Field, Input, Select } from "../components/ui";
import { PanelLeft } from "../components/ui/icons";

const NOTES_PAGE_SIZE_STEP = 100;
const NOTES_PAGE_SIZE_MAX = 200;

const TEMPLATE_VARIABLE_KEYS = ['taskTitle', 'date', 'area', 'priority', 'dueDate'] as const;

interface TemplateVariableState {
  taskTitle: string;
  date: string;
  area: string;
  priority: string;
  dueDate: string;
}

const AI_NOTE_ACTIONS: Array<{ action: NoteAiAction; label: string }> = [
  { action: 'SUMMARIZE', label: 'Summarize' },
  { action: 'EXTRACT_TASKS', label: 'Extract tasks' },
  { action: 'EXTRACT_DECISIONS', label: 'Extract decisions' },
  { action: 'REWRITE', label: 'Rewrite' },
  { action: 'CREATE_TASK_PLAN', label: 'Create task plan' },
];

interface ConvertTaskModalState {
  noteId: number;
  sourceText: string;
  title: string;
  dueDate: string;
  status: string;
  area: string;
  effort: string;
  parentTaskId: string;
  /** Set only when converting a persisted structured action item (issue #296) - see openConvertBlockModal. */
  noteBlockId?: number;
}

function emptyFormForTask(taskId: string): NoteFormState {
  return { ...EMPTY_FORM, taskId };
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * The Notes knowledge workspace (issue #299).
 *
 * The page is a shell: `useNotesWorkspace` owns discovery state (filters, smart view, sort,
 * display mode, URL sync), `useNoteScreenshots` owns capture, `useNoteVersionHistory` owns
 * history, and the composition below is navigation rail + knowledge explorer. What remains here
 * is note mutation orchestration and the editor/conversion dialogs.
 */
export function NotesPage() {
  const templatesQuery = useNoteTemplatesQuery();
  const collectionsQuery = useNoteCollectionsQuery();
  const savedViewsQuery = useNoteSavedViewsQuery();
  const settingsQuery = useSettingsQuery(true);
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

  const workspace = useNotesWorkspace({ collections, projects });
  const {
    linkedTaskId,
    filters,
    patchFilters,
    searchInput,
    setSearchInput,
    smartViewId,
    selectSmartView,
    selectCollection,
    applySavedView,
    clearFilters,
    currentSavedViewPayload,
    viewMode,
    setViewMode,
    activeChips,
    advancedFilterCount,
    hasActiveFilters,
    hasFiltersBeyondSmartView,
  } = workspace;

  const [notesPageSize, setNotesPageSize] = useState(100);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [draftBlocks, setDraftBlocks] = useState<DraftNoteBlock[]>(() => blocksFromBody(""));
  const [showRawBody, setShowRawBody] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isTemplateSectionOpen, setIsTemplateSectionOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [appliedSavedViewId, setAppliedSavedViewId] = useState<number | null>(null);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariableState>({ taskTitle: '', date: new Date().toISOString().slice(0, 10), area: '', priority: '', dueDate: '' });
  const [convertTaskModal, setConvertTaskModal] = useState<ConvertTaskModalState | null>(null);
  const [aiReviewSuggestion, setAiReviewSuggestion] = useState<NoteAiGenerationRecord | null>(null);
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const noteFormTitleRef = useRef<HTMLHeadingElement | null>(null);
  const noteTitleInputRef = useRef<HTMLInputElement | null>(null);
  const newNoteButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const wasCreateDrawerOpenRef = useRef(false);

  const aiGenerationsQuery = useNoteAiGenerationsQuery(editingNoteId ?? 0, editingNoteId !== null);
  const notesQuery = useNotesQuery(toNotesQueryFilters(filters, linkedTaskId, notesPageSize));
  const {
    createNote, createNoteFromTemplate, updateNote, deleteNote, uploadScreenshot, convertNoteToTask,
    createTaskLink, deleteTaskLink, restoreNoteVersion, runNoteAiAction, createSavedView, deleteSavedView,
  } = useNoteMutations();

  const latestMutationResult = latestResult(
    createNote.data,
    createNoteFromTemplate.data,
    updateNote.data,
    deleteNote.data,
    uploadScreenshot.data,
    convertNoteToTask.data,
    createTaskLink.data,
    deleteTaskLink.data,
  );
  const taskTitleById = useMemo(
    () => new Map(availableTasks.map((task) => [task.id, task.title])),
    [availableTasks],
  );
  const projectTitleById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const notes = useMemo<NoteRecord[]>(() => {
    const records: NoteRecord[] = Array.isArray(notesQuery.data?.data) ? notesQuery.data.data : [];
    if (!linkedTaskId) return records;

    return [...records].sort((first, second) => {
      const orderDelta = getStickyNoteNumber(first) - getStickyNoteNumber(second);
      return orderDelta === 0 ? first.id - second.id : orderDelta;
    });
  }, [linkedTaskId, notesQuery.data]);

  const {
    versionHistoryNoteId,
    setVersionHistoryNoteId,
    setSelectedVersionId,
    noteVersionsQuery,
    noteVersions,
    selectedVersion,
    versionHistoryNote,
    openVersionHistory,
    restoreSelectedVersion,
  } = useNoteVersionHistory({ notes, restoreNoteVersion, setForm, setDraftBlocks, setEditingNoteId, formatDate });

  const notesQueryErrorMessage =
    notesQuery.data && !notesQuery.data.ok
      ? notesQuery.data.error?.message ??
        (notesQuery.data.status
          ? `Request failed with status ${notesQuery.data.status}.`
          : notesQuery.data.error?.details ?? "Request failed.")
      : undefined;

  const isBusy =
    createNote.isPending || createNoteFromTemplate.isPending || updateNote.isPending || deleteNote.isPending ||
    convertNoteToTask.isPending || createTaskLink.isPending || deleteTaskLink.isPending ||
    runNoteAiAction.isPending || restoreNoteVersion.isPending;
  const screenshotNoteTaskId = linkedTaskId || (editingNoteId === null ? form.taskId.trim() : "");
  const activeForm =
    editingNoteId === null && linkedTaskId && form.taskId.trim() === ""
      ? { ...form, taskId: linkedTaskId }
      : form;

  const {
    attachmentCaptions,
    setAttachmentCaptions,
    screenshotMessages,
    screenshotNoteMessage,
    clipboardImageMessage,
    setClipboardImageMessage,
    pendingClipboardImages,
    capturingNoteId,
    isCreatingScreenshotNote,
    cropOverlay,
    setScreenshotFileInput,
    cropImageRef,
    isUploadPending,
    isCapturePending,
    handleBodyPaste,
    handleScreenshotNote,
    handleTakeScreenshot,
    handleScreenshotSubmit,
    cancelCropOverlay,
    confirmCropOverlay,
    handleCropPointerDown,
    handleCropPointerMove,
    handleCropPointerUp,
    getNormalizedSelection,
  } = useNoteScreenshots({
    activeForm,
    setForm,
    editingNoteId,
    setEditingNoteId,
    isBusy,
    screenshotNoteTaskId,
    noteBodyRef,
    createNote,
    updateNote,
    uploadScreenshot,
    refetchNotes: notesQuery.refetch,
  });

  const effectiveBody = bodyFromBlocks(draftBlocks) || activeForm.body;
  const settings = settingsQuery.data?.data as Record<string, unknown> | undefined;
  const aiFeaturesEnabled = settings?.aiFeaturesEnabled === true;
  const aiGenerations = useMemo<NoteAiGenerationRecord[]>(
    () => (Array.isArray(aiGenerationsQuery.data?.data) ? aiGenerationsQuery.data.data : []),
    [aiGenerationsQuery.data],
  );
  const templates = useMemo<NoteTemplateRecord[]>(
    () => (Array.isArray(templatesQuery.data?.data) ? templatesQuery.data.data : []),
    [templatesQuery.data],
  );
  const selectedTemplate = templates.find((template) => String(template.id) === selectedTemplateId) ?? null;
  const renderedTemplatePreview = selectedTemplate
    ? TEMPLATE_VARIABLE_KEYS.reduce((content, key) => content.replaceAll(`{{${key}}}`, templateVariables[key]), selectedTemplate.content)
    : '';
  const canCreateFromTemplate = Boolean(selectedTemplate) && !isBusy;
  const canSubmit = activeForm.title.trim().length > 0 && effectiveBody.trim().length > 0 && !isBusy;
  const drawerNoteDate = useMemo(() => {
    if (editingNoteId === null) return new Date().toISOString().slice(0, 10);
    const noteDate = notes.find((note) => note.id === editingNoteId)?.createdAt;
    return noteDate && !Number.isNaN(new Date(noteDate).getTime())
      ? new Date(noteDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }, [editingNoteId, notes]);

  const activeSmartView = findSmartView(smartViewId);
  const activeProjectName = filters.projectId ? projectTitleById.get(Number(filters.projectId)) : undefined;
  const linkedTaskTitle = linkedTaskId ? taskTitleById.get(Number(linkedTaskId)) : undefined;

  const saveCurrentView = () => {
    const name = window.prompt("Saved view name");
    if (!name?.trim()) return;
    createSavedView.mutate({ name: name.trim(), ...currentSavedViewPayload });
  };

  const openConvertTaskModal = (sourceText: string) => {
    if (editingNoteId === null) {
      setClipboardImageMessage({ kind: "error", text: "Save the note before converting note content into a task." });
      return;
    }
    const trimmed = sourceText.trim();
    setConvertTaskModal({ noteId: editingNoteId, sourceText: trimmed, title: trimmed.slice(0, 255), dueDate: "", status: "", area: "PERSONAL", effort: "MEDIUM", parentTaskId: "" });
  };

  /**
   * Converts a persisted structured action item (a real `NoteBlock` row, not the draft block
   * editor's client-only reconstruction) - passes `noteBlockId` so the backend's idempotent
   * (note, block) conversion applies (issue #296/#287). Free-text conversion above never sets it.
   */
  const openConvertBlockModal = (note: NoteRecord, block: NoteBlockRecord) => {
    const trimmed = (block.content ?? "").trim();
    setConvertTaskModal({ noteId: note.id, sourceText: trimmed, title: trimmed.slice(0, 255) || note.title, dueDate: "", status: "", area: "PERSONAL", effort: "MEDIUM", parentTaskId: "", noteBlockId: block.id });
  };

  const submitConvertTask = () => {
    if (!convertTaskModal) return;
    convertNoteToTask.mutate({
      noteId: convertTaskModal.noteId,
      body: {
        title: convertTaskModal.title,
        selectedText: convertTaskModal.sourceText,
        dueDate: convertTaskModal.dueDate || null,
        status: convertTaskModal.status || null,
        area: convertTaskModal.area || null,
        effort: convertTaskModal.effort || null,
        parentTaskId: convertTaskModal.parentTaskId ? Number(convertTaskModal.parentTaskId) : null,
        noteBlockId: convertTaskModal.noteBlockId ?? null,
      },
    }, { onSuccess: (result) => { if (result.ok) setConvertTaskModal(null); } });
  };

  const linkMentionedTask = (noteId: number, taskId: number, selectedText: string, linkType = "MENTION") => {
    createTaskLink.mutate({ noteId, body: { taskId, selectedText, linkType } });
  };

  const handleTaskMentionShortcut = () => {
    if (editingNoteId === null) {
      setClipboardImageMessage({ kind: "error", text: "Save the note before linking task mentions." });
      return;
    }

    const textarea = noteBodyRef.current;
    const selected = textarea && textarea.selectionStart !== textarea.selectionEnd
      ? activeForm.body.slice(textarea.selectionStart, textarea.selectionEnd)
      : "";
    const firstTask = availableTasks.find((task) => String(task.id) === activeForm.taskId) ?? availableTasks[0];
    if (!firstTask) {
      setClipboardImageMessage({ kind: "error", text: "Create or load a task before adding a task mention." });
      return;
    }

    linkMentionedTask(editingNoteId, firstTask.id, selected || `@task ${firstTask.title}`);
  };

  const focusNoteEditor = useCallback(() => {
    window.setTimeout(() => {
      const target = noteTitleInputRef.current ?? noteFormTitleRef.current;
      target?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...emptyFormForTask(linkedTaskId), projectId: filters.projectId });
    setDraftBlocks(blocksFromBody(""));
    setShowRawBody(false);
    setEditingNoteId(null);
    setAiReviewSuggestion(null);
    setIsTemplateSectionOpen(false);
    setIsCreateDrawerOpen(false);
  }, [filters.projectId, linkedTaskId]);

  const openNewNoteEditor = () => {
    resetForm();
    setIsCreateDrawerOpen(true);
    focusNoteEditor();
  };

  const openTemplateEditor = () => {
    resetForm();
    setIsTemplateSectionOpen(true);
    setIsCreateDrawerOpen(true);
  };

  const editNote = useCallback((note: NoteRecord) => {
    setEditingNoteId(note.id);
    setForm(noteToForm(note));
    setDraftBlocks(blocksFromBody(note.body ?? ""));
    setShowRawBody(false);
    setAiReviewSuggestion(null);
    setIsTemplateSectionOpen(false);
    setIsCreateDrawerOpen(true);
    focusNoteEditor();
  }, [focusNoteEditor]);

  const runAiActionForNote = (action: NoteAiAction) => {
    if (editingNoteId === null) {
      setClipboardImageMessage({ kind: "error", text: "Save the note before running AI actions." });
      return;
    }
    if (!aiFeaturesEnabled) {
      setClipboardImageMessage({ kind: "error", text: "AI features are disabled in settings for offline or privacy-sensitive use." });
      return;
    }
    runNoteAiAction.mutate({ noteId: editingNoteId, action }, {
      onSuccess: (result) => { if (result.ok) setAiReviewSuggestion(result.data); },
    });
  };

  const appendAiSuggestionToBody = () => {
    if (!aiReviewSuggestion) return;
    const addition = `\n\n---\nAI-generated ${aiReviewSuggestion.action.toLowerCase().replaceAll("_", " ")} (${formatDate(aiReviewSuggestion.createdAt)})\n${aiReviewSuggestion.generatedContent}`;
    const nextBody = `${activeForm.body}${addition}`;
    setForm((current) => ({ ...current, body: nextBody }));
    setDraftBlocks(blocksFromBody(nextBody));
    setAiReviewSuggestion(null);
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate || !canCreateFromTemplate) return;
    const linkedTask = availableTasks.find((task) => String(task.id) === activeForm.taskId);
    createNoteFromTemplate.mutate({
      templateId: selectedTemplate.id,
      title: renderedTemplatePreview.split('\n')[0]?.replace(/^#+\s*/, '') || selectedTemplate.name,
      taskId: activeForm.taskId.trim() ? Number(activeForm.taskId.trim()) : null,
      tags: parseTags(activeForm.tags),
      variables: {
        ...templateVariables,
        taskTitle: templateVariables.taskTitle || linkedTask?.title || '',
      },
    }, {
      onSuccess: (result) => { if (result.ok) resetForm(); },
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = { ...buildNotePayload(activeForm), body: effectiveBody };
    if (editingNoteId === null) {
      createNote.mutate(payload, { onSuccess: (result) => { if (result.ok) resetForm(); } });
      return;
    }

    updateNote.mutate({ id: editingNoteId, body: payload }, { onSuccess: (result) => { if (result.ok) resetForm(); } });
  };

  const copyBody = useCallback((note: NoteRecord) => {
    if (!navigator.clipboard) return;

    void navigator.clipboard
      .writeText(note.body)
      .then(() => {
        setCopiedNoteId(note.id);
        window.setTimeout(
          () => setCopiedNoteId((current) => (current === note.id ? null : current)),
          1600,
        );
      })
      .catch(() => setCopiedNoteId(null));
  }, []);

  useEffect(() => {
    if (isCreateDrawerOpen) {
      focusNoteEditor();
    } else if (wasCreateDrawerOpenRef.current) {
      window.setTimeout(() => {
        newNoteButtonRef.current?.focus({ preventScroll: true });
      }, 0);
    }

    wasCreateDrawerOpenRef.current = isCreateDrawerOpen;
  }, [focusNoteEditor, isCreateDrawerOpen]);

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
      onDeleteSavedView={(view) => {
        if (window.confirm(`Delete saved view "${view.name}"?`)) deleteSavedView.mutate(view.id);
      }}
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
        onNewNote={openNewNoteEditor}
        onNewFromTemplate={openTemplateEditor}
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
              onNewNote={openNewNoteEditor}
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
                onEdit={editNote}
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

      <CreateNoteDrawer
        isOpen={isCreateDrawerOpen}
        onClose={resetForm}
        editingNoteId={editingNoteId}
        isBusy={isBusy}
        canSubmit={canSubmit}
        noteFormTitleRef={noteFormTitleRef}
        noteTitleInputRef={noteTitleInputRef}
        canCreateFromTemplate={canCreateFromTemplate}
        handleCreateFromTemplate={handleCreateFromTemplate}
        isCreateFromTemplatePending={createNoteFromTemplate.isPending}
        templatesQueryIsLoading={templatesQuery.isLoading}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        templateVariableKeys={TEMPLATE_VARIABLE_KEYS}
        templateVariables={templateVariables}
        setTemplateVariables={setTemplateVariables}
        selectedTemplate={selectedTemplate}
        renderedTemplatePreview={renderedTemplatePreview}
        isTemplateSectionOpen={isTemplateSectionOpen}
        setIsTemplateSectionOpen={setIsTemplateSectionOpen}
        handleSubmit={handleSubmit}
        activeForm={activeForm}
        noteDate={drawerNoteDate}
        setForm={setForm}
        availableTasks={availableTasks}
        collections={collections}
        draftBlocks={draftBlocks}
        setDraftBlocks={setDraftBlocks}
        handleTaskMentionShortcut={handleTaskMentionShortcut}
        aiFeaturesEnabled={aiFeaturesEnabled}
        aiNoteActions={AI_NOTE_ACTIONS}
        runAiActionForNote={runAiActionForNote}
        aiReviewSuggestion={aiReviewSuggestion}
        setAiReviewSuggestion={setAiReviewSuggestion}
        appendAiSuggestionToBody={appendAiSuggestionToBody}
        aiGenerations={aiGenerations}
        showRawBody={showRawBody}
        setShowRawBody={setShowRawBody}
        noteBodyRef={noteBodyRef}
        handleBodyPaste={handleBodyPaste}
        notes={notes}
        projects={projects}
        deleteTaskLink={deleteTaskLink}
        clipboardImageMessage={clipboardImageMessage}
        pendingClipboardImages={pendingClipboardImages}
        latestMutationResult={latestMutationResult}
        onConvertToTask={openConvertTaskModal}
        onOpenVersionHistory={() => {
          const note = notes.find((candidate) => candidate.id === editingNoteId);
          if (note) openVersionHistory(note);
        }}
        linkMentionedTask={linkMentionedTask}
      />

      <Dialog
        open={Boolean(convertTaskModal)}
        onOpenChange={(open) => { if (!open) setConvertTaskModal(null); }}
        title="Convert to task"
        footer={
          <Button variant="primary" disabled={!convertTaskModal?.title.trim() || convertNoteToTask.isPending} onClick={submitConvertTask}>
            Create linked task
          </Button>
        }
      >
        {convertTaskModal ? (
          <div className="flex flex-col gap-3">
            {convertTaskModal.noteBlockId ? (
              <p className="text-sm text-fg-muted">Converting this action item — it can only become one task, even if you convert it again.</p>
            ) : null}
            <Field label="Title" htmlFor="convertTaskTitle">
              <Input id="convertTaskTitle" value={convertTaskModal.title} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, title: event.target.value } : current)} />
            </Field>
            <Field label="Due date" htmlFor="convertTaskDueDate">
              <Input id="convertTaskDueDate" type="date" value={convertTaskModal.dueDate} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, dueDate: event.target.value } : current)} />
            </Field>
            <Field label="Status" htmlFor="convertTaskStatus">
              <Select id="convertTaskStatus" value={convertTaskModal.status} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, status: event.target.value } : current)}>
                <option value="">Backlog</option>
                <option value="NOT_STARTED">Not started</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="WAITING">Waiting</option>
              </Select>
            </Field>
            <Field label="Area" htmlFor="convertTaskArea">
              <Select id="convertTaskArea" value={convertTaskModal.area} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, area: event.target.value } : current)}>
                <option value="PERSONAL">Personal</option>
                <option value="WORK">Work</option>
                <option value="STUDY">Study</option>
                <option value="HEALTH">Health</option>
                <option value="FAMILY">Family</option>
              </Select>
            </Field>
            <Field label="Effort" htmlFor="convertTaskEffort">
              <Select id="convertTaskEffort" value={convertTaskModal.effort} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, effort: event.target.value } : current)}>
                <option value="QUICK">Quick</option>
                <option value="MEDIUM">Medium</option>
                <option value="DEEP_WORK">Deep work</option>
                <option value="LARGE">Large</option>
              </Select>
            </Field>
            <Field label="Linked task parent" htmlFor="convertTaskParentId">
              <Select id="convertTaskParentId" value={convertTaskModal.parentTaskId} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, parentTaskId: event.target.value } : current)}>
                <option value="">No parent</option>
                {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </Select>
            </Field>
            <p className="text-sm text-fg-muted">Created from note text: {convertTaskModal.sourceText.slice(0, 160)}</p>
          </div>
        ) : null}
      </Dialog>

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
