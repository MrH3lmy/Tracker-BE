import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { isQueryError } from "../apiClient";
import { NoteActions } from "../components/notes/NoteActions";
import { NoteCard } from "../components/notes/NoteCard";
import { CreateNoteDrawer } from "../components/notes/CreateNoteDrawer";
import { NotesToolbar } from "../components/notes/NotesToolbar";
import { NotesHeader } from "../components/notes/NotesHeader";
import { NotesResults } from "../components/notes/NotesResults";
import { NotesState } from "../components/notes/NotesState";
import { NotesTable } from "../components/notes/NotesTable";
import { NotesSidebar } from "../components/notes/NotesSidebar";
import { NoteVersionHistoryPanel } from "../components/notes/NoteVersionHistoryPanel";
import { ScreenshotCropOverlay } from "../components/notes/ScreenshotCropOverlay";
import { blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "../components/notes/NoteBlockEditor";
import { useNoteVersionHistory } from "../components/notes/useNoteVersionHistory";
import { useNoteScreenshots } from "../components/notes/useNoteScreenshots";
import type {
  NoteAiAction,
  NoteAiGenerationRecord,
  NoteContentType,
  NoteRecord,
  NoteTemplateRecord,
} from "../components/notes/noteTypes";
import {
  buildNotePayload,
  EMPTY_FORM,
  formatDate,
  getStickyNoteNumber,
  humanizeContentType,
  noteToForm,
  type NoteFormState,
  type NoteSortBy,
  type NotesViewMode,
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
  useSettingsQuery,
  useTasksQuery,
} from "../hooks/useApiQueries";
import { Button, Card, Dialog, Field, Input, Select } from "../components/ui";

const NOTES_PAGE_SIZE_STEP = 100;
const NOTES_PAGE_SIZE_MAX = 200;

const TEMPLATE_VARIABLE_KEYS = ['taskTitle', 'date', 'area', 'priority', 'dueDate'] as const;
const DEFAULT_NOTE_SAVED_VIEWS = [
  { name: 'All notes', filters: {}, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
  { name: 'Recent', filters: {}, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
  { name: 'Screenshots', filters: { hasAttachments: true }, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
  { name: 'Task notes', filters: { linkedTask: true }, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
  { name: 'Untagged', filters: { untagged: true }, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'table' as NotesViewMode },
  { name: 'Decisions', filters: { tags: 'decision', tagMode: 'all' }, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
  { name: 'Checklists', filters: { contentType: 'MARKDOWN', q: '- [ ]' }, sortField: 'updatedAt', sortDirection: 'desc' as const, viewType: 'list' as NotesViewMode },
];


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

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const linkedTaskId = searchParams.get("taskId")?.trim() ?? "";
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<NotesViewMode>("list");
  const [sortBy, setSortBy] = useState<NoteSortBy>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [contentTypeFilter, setContentTypeFilter] = useState<
    NoteContentType | "all"
  >("all");
  const [tagFilter, setTagFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [hasAttachmentsFilter, setHasAttachmentsFilter] = useState<"" | "true" | "false">("");
  const [linkedTaskFilter, setLinkedTaskFilter] = useState<"" | "true" | "false">("");
  const [untaggedFilter, setUntaggedFilter] = useState<"" | "true" | "false">("");
  const [tagMode, setTagMode] = useState<"any" | "all">("any");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [notesPageSize, setNotesPageSize] = useState(100);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [draftBlocks, setDraftBlocks] = useState<DraftNoteBlock[]>(() => blocksFromBody(""));
  const [showRawBody, setShowRawBody] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariableState>({ taskTitle: '', date: new Date().toISOString().slice(0, 10), area: '', priority: '', dueDate: '' });
  const [convertTaskModal, setConvertTaskModal] = useState<ConvertTaskModalState | null>(null);
  const [aiReviewSuggestion, setAiReviewSuggestion] = useState<NoteAiGenerationRecord | null>(null);
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const noteFormTitleRef = useRef<HTMLHeadingElement | null>(null);
  const noteTitleInputRef = useRef<HTMLInputElement | null>(null);
  const newNoteButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasCreateDrawerOpenRef = useRef(false);

  const templatesQuery = useNoteTemplatesQuery();
  const collectionsQuery = useNoteCollectionsQuery();
  const savedViewsQuery = useNoteSavedViewsQuery();
  const settingsQuery = useSettingsQuery(true);
  const aiGenerationsQuery = useNoteAiGenerationsQuery(editingNoteId ?? 0, editingNoteId !== null);
  const notesQuery = useNotesQuery({
    q: search,
    contentType: contentTypeFilter,
    taskId: linkedTaskId,
    collectionId: collectionFilter,
    tags: tagFilter,
    hasAttachments: hasAttachmentsFilter === "" ? "" : hasAttachmentsFilter === "true",
    linkedTask: linkedTaskFilter === "" ? "" : linkedTaskFilter === "true",
    untagged: untaggedFilter === "" ? "" : untaggedFilter === "true",
    tagMode,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sortBy,
    sortDirection,
    size: notesPageSize,
  });
  const tasksQuery = useTasksQuery("active");
  const { createNote, createNoteFromTemplate, updateNote, deleteNote, uploadScreenshot, convertNoteToTask, createTaskLink, deleteTaskLink, restoreNoteVersion, runNoteAiAction, createSavedView, deleteSavedView } =
    useNoteMutations();
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
  const availableTasks = useMemo<TaskRecord[]>(
    () => (Array.isArray(tasksQuery.data?.data) ? tasksQuery.data.data : []),
    [tasksQuery.data],
  );
  const taskTitleById = useMemo(
    () => new Map(availableTasks.map((task) => [task.id, task.title])),
    [availableTasks],
  );
  const collections = Array.isArray(collectionsQuery.data?.data)
    ? collectionsQuery.data.data
    : [];
  const savedViews = Array.isArray(savedViewsQuery.data?.data)
    ? savedViewsQuery.data.data
    : [];

  const notes = useMemo<NoteRecord[]>(() => {
    const records: NoteRecord[] = Array.isArray(notesQuery.data?.data)
      ? notesQuery.data.data
      : [];
    if (!linkedTaskId) return records;

    return [...records].sort((first, second) => {
      const orderDelta =
        getStickyNoteNumber(first) - getStickyNoteNumber(second);
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
  const hasActiveNoteFilters = Boolean(
    search.trim() ||
      contentTypeFilter !== "all" ||
      tagFilter.trim() ||
      collectionFilter ||
      hasAttachmentsFilter ||
      linkedTaskFilter ||
      untaggedFilter ||
      createdFrom ||
      createdTo ||
      updatedFrom ||
      updatedTo,
  );
  const recentNotes = useMemo(() => [...notes].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()).slice(0, 5), [notes]);
  const taskLinkedNotes = useMemo(() => notes.filter((note) => note.taskId || (note.taskLinks?.length ?? 0) > 0).slice(0, 5), [notes]);
  const archivedNotes = useMemo(() => notes.filter((note) => note.tags?.includes("archived")).slice(0, 5), [notes]);
  const isBusy =
    createNote.isPending || createNoteFromTemplate.isPending || updateNote.isPending || deleteNote.isPending || convertNoteToTask.isPending || createTaskLink.isPending || deleteTaskLink.isPending || runNoteAiAction.isPending || restoreNoteVersion.isPending;
  const screenshotNoteTaskId =
    linkedTaskId || (editingNoteId === null ? form.taskId.trim() : "");
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
  const renderedTemplatePreview = selectedTemplate ? TEMPLATE_VARIABLE_KEYS.reduce((content, key) => content.replaceAll(`{{${key}}}`, templateVariables[key]), selectedTemplate.content) : '';
  const canCreateFromTemplate = Boolean(selectedTemplate) && !isBusy;
  const canSubmit =
    activeForm.title.trim().length > 0 &&
    effectiveBody.trim().length > 0 &&
    !isBusy;
  const drawerNoteDate = useMemo(() => {
    if (editingNoteId === null) return new Date().toISOString().slice(0, 10);
    const noteDate = notes.find((note) => note.id === editingNoteId)?.createdAt;
    return noteDate && !Number.isNaN(new Date(noteDate).getTime())
      ? new Date(noteDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }, [editingNoteId, notes]);
  const groupedTimelineNotes = useMemo(() => {
    return notes.reduce<Record<string, NoteRecord[]>>((groups, note) => {
      const rawDate = sortBy === "createdAt" ? note.createdAt : note.updatedAt || note.createdAt;
      const key = rawDate && !Number.isNaN(new Date(rawDate).getTime())
        ? new Date(rawDate).toLocaleDateString()
        : "No date";
      groups[key] = [...(groups[key] ?? []), note];
      return groups;
    }, {});
  }, [notes, sortBy]);


  const applySavedView = (view: { filters: Record<string, unknown>; sortField: string; sortDirection: string; viewType: string }) => {
    const filters = view.filters ?? {};
    setSearch(typeof filters.q === "string" ? filters.q : "");
    setContentTypeFilter(typeof filters.contentType === "string" ? filters.contentType as NoteContentType : "all");
    setTagFilter(typeof filters.tags === "string" ? filters.tags : "");
    setCollectionFilter(filters.collectionId == null ? "" : String(filters.collectionId));
    setHasAttachmentsFilter(typeof filters.hasAttachments === "boolean" ? String(filters.hasAttachments) as "true" | "false" : "");
    setLinkedTaskFilter(typeof filters.linkedTask === "boolean" ? String(filters.linkedTask) as "true" | "false" : "");
    setUntaggedFilter(typeof filters.untagged === "boolean" ? String(filters.untagged) as "true" | "false" : "");
    setTagMode(filters.tagMode === "all" ? "all" : "any");
    setCreatedFrom(typeof filters.createdFrom === "string" ? filters.createdFrom : "");
    setCreatedTo(typeof filters.createdTo === "string" ? filters.createdTo : "");
    setUpdatedFrom(typeof filters.updatedFrom === "string" ? filters.updatedFrom : "");
    setUpdatedTo(typeof filters.updatedTo === "string" ? filters.updatedTo : "");
    setSortBy((view.sortField || "updatedAt") as NoteSortBy);
    setSortDirection(view.sortDirection === "asc" ? "asc" : "desc");
    setViewMode((view.viewType || "list") as NotesViewMode);
  };

  const saveCurrentView = () => {
    const name = window.prompt("Saved view name");
    if (!name?.trim()) return;
    createSavedView.mutate({
      name: name.trim(),
      filters: { q: search, contentType: contentTypeFilter === "all" ? undefined : contentTypeFilter, tags: tagFilter, collectionId: collectionFilter || undefined, hasAttachments: hasAttachmentsFilter === "" ? undefined : hasAttachmentsFilter === "true", linkedTask: linkedTaskFilter === "" ? undefined : linkedTaskFilter === "true", untagged: untaggedFilter === "" ? undefined : untaggedFilter === "true", tagMode, createdFrom, createdTo, updatedFrom, updatedTo },
      sortField: sortBy,
      sortDirection,
      viewType: viewMode,
    });
  };


  const openConvertTaskModal = (sourceText: string) => {
    if (editingNoteId === null) {
      setClipboardImageMessage({ kind: "error", text: "Save the note before converting note content into a task." });
      return;
    }
    const trimmed = sourceText.trim();
    setConvertTaskModal({ noteId: editingNoteId, sourceText: trimmed, title: trimmed.slice(0, 255), dueDate: "", status: "", area: "PERSONAL", effort: "MEDIUM", parentTaskId: "" });
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

  const resetForm = () => {
    setForm(emptyFormForTask(linkedTaskId));
    setDraftBlocks(blocksFromBody(""));
    setShowRawBody(false);
    setEditingNoteId(null);
    setAiReviewSuggestion(null);
    setIsCreateDrawerOpen(false);
  };

  const openNewNoteEditor = () => {
    resetForm();
    setIsCreateDrawerOpen(true);
    focusNoteEditor();
  };

  const clearNoteFilters = () => {
    setSearch("");
    setContentTypeFilter("all");
    setTagFilter("");
    setCollectionFilter("");
    setHasAttachmentsFilter("");
    setLinkedTaskFilter("");
    setUntaggedFilter("");
    setTagMode("any");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
  };

  const editNote = (note: NoteRecord) => {
    setEditingNoteId(note.id);
    setForm(noteToForm(note));
    setDraftBlocks(blocksFromBody(note.body ?? ""));
    setShowRawBody(false);
    setAiReviewSuggestion(null);
    setIsCreateDrawerOpen(true);
    focusNoteEditor();
  };

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
      onSuccess: (result) => {
        if (result.ok) resetForm();
      },
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = { ...buildNotePayload(activeForm), body: effectiveBody };
    if (editingNoteId === null) {
      createNote.mutate(payload, {
        onSuccess: (result) => {
          if (result.ok) resetForm();
        },
      });
      return;
    }

    updateNote.mutate(
      { id: editingNoteId, body: payload },
      {
        onSuccess: (result) => {
          if (result.ok) resetForm();
        },
      },
    );
  };

  const copyBody = (note: NoteRecord) => {
    if (!navigator.clipboard) return;

    void navigator.clipboard
      .writeText(note.body)
      .then(() => {
        setCopiedNoteId(note.id);
        window.setTimeout(
          () =>
            setCopiedNoteId((current) =>
              current === note.id ? null : current,
            ),
          1600,
        );
      })
      .catch(() => setCopiedNoteId(null));
  };

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

  return (
    <div className="flex flex-col gap-5" aria-busy={isBusy}>
      <NotesHeader
        canCaptureAreaNote={Boolean(screenshotNoteTaskId)}
        isBusy={isBusy}
        isUploadPending={isUploadPending}
        isCapturePending={isCapturePending}
        isCreatingScreenshotNote={isCreatingScreenshotNote}
        isLinkedTaskView={Boolean(linkedTaskId)}
        isReloading={notesQuery.isFetching}
        onCaptureAreaNote={() => void handleScreenshotNote()}
        onNewNote={openNewNoteEditor}
        onReload={() => void notesQuery.refetch()}
        newNoteButtonRef={newNoteButtonRef}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
        <NotesSidebar
          collectionFilter={collectionFilter}
          setCollectionFilter={setCollectionFilter}
          collections={collections}
          savedViews={savedViews}
          defaultSavedViews={DEFAULT_NOTE_SAVED_VIEWS}
          applySavedView={applySavedView}
          deleteSavedView={deleteSavedView}
          saveCurrentView={saveCurrentView}
          createSavedView={createSavedView}
          recentNotes={recentNotes}
          taskLinkedNotes={taskLinkedNotes}
          archivedNotes={archivedNotes}
          setEditingNoteId={(noteId) => { setEditingNoteId(noteId); setIsCreateDrawerOpen(true); focusNoteEditor(); }}
          setForm={setForm}
          setDraftBlocks={setDraftBlocks}
        />

      <section
        className="min-w-0 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-2xs sm:p-6"
        aria-labelledby="notes-filters-title"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="notes-filters-title" className="text-sm font-semibold text-fg">
              {linkedTaskId
                ? `Notes for task #${linkedTaskId}`
                : "Browse notes"}
            </h3>
            <p className="mt-0.5 text-sm text-fg-muted">
              {linkedTaskId
                ? "Showing only notes linked to this task. Search and content-type filters still apply."
                : "Search note titles and bodies, then narrow by content type or tag."}
            </p>
          </div>
        </div>

        <NotesToolbar
          search={search}
          setSearch={setSearch}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          collectionFilter={collectionFilter}
          setCollectionFilter={setCollectionFilter}
          collections={collections}
          contentTypeFilter={contentTypeFilter}
          setContentTypeFilter={setContentTypeFilter}
          hasAttachmentsFilter={hasAttachmentsFilter}
          setHasAttachmentsFilter={setHasAttachmentsFilter}
          linkedTaskFilter={linkedTaskFilter}
          setLinkedTaskFilter={setLinkedTaskFilter}
          untaggedFilter={untaggedFilter}
          setUntaggedFilter={setUntaggedFilter}
          tagMode={tagMode}
          setTagMode={setTagMode}
          createdFrom={createdFrom}
          setCreatedFrom={setCreatedFrom}
          createdTo={createdTo}
          setCreatedTo={setCreatedTo}
          updatedFrom={updatedFrom}
          setUpdatedFrom={setUpdatedFrom}
          updatedTo={updatedTo}
          setUpdatedTo={setUpdatedTo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
        />

        {screenshotNoteMessage ? (
          <p
            className={screenshotNoteMessage.kind === "error" ? "mt-3 text-sm text-critical" : "mt-3 text-sm text-fg-muted"}
            role={screenshotNoteMessage.kind === "error" ? "alert" : "status"}
          >
            {screenshotNoteMessage.text}
          </p>
        ) : null}

        <div className="mt-4">
          <NotesState
            isLoading={notesQuery.isLoading}
            isError={isQueryError(notesQuery.data)}
            isEmpty={!notesQuery.isLoading && notes.length === 0}
            hasActiveFilters={hasActiveNoteFilters}
            errorMessage={notesQueryErrorMessage}
            onClearFilters={clearNoteFilters}
            onNewNote={openNewNoteEditor}
          />
        </div>

        <div className="mt-4">
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
        </div>

        <div className="mt-4">
        <NotesResults viewMode={viewMode}>
        {viewMode === "sticky" ? (
          // note.positionX/positionY/width/height/zIndex are still written on
          // create/edit (kept for backend/API compatibility and any future
          // drag-to-reposition feature), but are no longer read for layout:
          // there was never any drag interaction wired up for them, so a
          // responsive masonry grid replaces the old absolute-position canvas.
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4" aria-label="Sticky note board">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                layout="tile"
                eyebrow={<p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Sticky note #{getStickyNoteNumber(note)}</p>}
                subtitle={<p className="text-xs text-fg-muted">{note.collectionName ?? "No collection"} · Task {note.taskId ? taskTitleById.get(note.taskId) ?? `#${note.taskId}` : "none"} · Updated {formatDate(note.updatedAt)}</p>}
                actions={<NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} screenshotMode="compact" onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)} onScreenshotSubmit={handleScreenshotSubmit} screenshotMessage={screenshotMessages[note.id]} attachmentCaption={attachmentCaptions[note.id] ?? ""} onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))} screenshotInputRef={(element) => setScreenshotFileInput(note.id, element)} isUploadPending={isUploadPending} isCapturePending={isCapturePending} isCapturing={capturingNoteId === note.id} />}
              />
            ))}
          </div>
        ) : null}

        {viewMode === "list" ? (
          <div className="flex flex-col gap-3" aria-label="Fast scanning notes list">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                layout="row"
                subtitle={<p className="text-sm text-fg-muted">{note.collectionName ?? "No collection"} · {humanizeContentType(note.contentType)} · {note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · Updated {formatDate(note.updatedAt)}</p>}
                actions={<NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} screenshotMode="inline" onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)} onScreenshotSubmit={handleScreenshotSubmit} screenshotMessage={screenshotMessages[note.id]} attachmentCaption={attachmentCaptions[note.id] ?? ""} onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))} screenshotInputRef={(element) => setScreenshotFileInput(note.id, element)} isUploadPending={isUploadPending} isCapturePending={isCapturePending} isCapturing={capturingNoteId === note.id} />}
              />
            ))}
          </div>
        ) : null}

        {viewMode === "table" ? (
          <NotesTable
            notes={notes}
            taskTitleById={taskTitleById}
            copiedNoteId={copiedNoteId}
            onEdit={editNote}
            onCopy={copyBody}
            onVersionHistory={openVersionHistory}
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

        {viewMode === "timeline" ? (
          <div className="flex flex-col gap-4" aria-label="Notes timeline">
            {Object.entries(groupedTimelineNotes).map(([date, dateNotes]) => (
              <Card key={date} aria-label={`Notes from ${date}`}>
                <h3 className="text-sm font-semibold text-fg">{date}</h3>
                <div className="mt-3 flex flex-col gap-3">
                  {dateNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      layout="row"
                      eyebrow={<p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}</p>}
                      subtitle={<p className="text-sm text-fg-muted">{note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · {humanizeContentType(note.contentType)}</p>}
                      actions={<NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} screenshotMode="compact" onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)} onScreenshotSubmit={handleScreenshotSubmit} screenshotMessage={screenshotMessages[note.id]} attachmentCaption={attachmentCaptions[note.id] ?? ""} onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))} screenshotInputRef={(element) => setScreenshotFileInput(note.id, element)} isUploadPending={isUploadPending} isCapturePending={isCapturePending} isCapturing={capturingNoteId === note.id} />}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
        </NotesResults>

        {!notesQuery.isLoading && notes.length >= notesPageSize && notesPageSize < NOTES_PAGE_SIZE_MAX ? (
          <div className="mt-4 flex justify-center">
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
        deleteTaskLink={deleteTaskLink}
        clipboardImageMessage={clipboardImageMessage}
        pendingClipboardImages={pendingClipboardImages}
        latestMutationResult={latestMutationResult}
        onConvertToTask={openConvertTaskModal}
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
