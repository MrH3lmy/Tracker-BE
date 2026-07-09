import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type PointerEvent } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "../components/notes/NotesPage.module.css";
import { CodePreview } from "../components/notes/CodePreview";
import { NoteActions } from "../components/notes/NoteActions";
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
import type {
  NoteAiAction,
  NoteAiGenerationRecord,
  NoteAttachmentRecord,
  NoteContentType,
  NoteRecord,
  NoteTemplateRecord,
  NoteVersionRecord,
} from "../components/notes/noteTypes";
import {
  EMPTY_FORM,
  formatDate,
  getStickyNoteNumber,
  humanizeContentType,
  noteToForm,
  type CropOverlayState,
  type CropPoint,
  type CropSelection,
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
  useNoteVersionsQuery,
  useNoteTemplatesQuery,
  useNoteSavedViewsQuery,
  useNotesQuery,
  useSettingsQuery,
  useTasksQuery,
} from "../hooks/useApiQueries";

const SUPPORTED_CLIPBOARD_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const SCREEN_CAPTURE_UNAVAILABLE_MESSAGE =
  "Screen capture is not available in this browser. Please attach an image file instead.";
const SCREEN_CAPTURE_DENIED_MESSAGE =
  "Screen capture was cancelled or denied. Please allow screen sharing to take a screenshot.";
const SCREENSHOT_NOTE_BODY =
  "Screenshot captured from the notes page for the selected task.";
const SCREENSHOT_NOTE_UPLOAD_CAPTION = "Screenshot captured for this task.";
const PASTED_SCREENSHOT_PENDING_REFERENCE = "[Pasted screenshot pending upload]";
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

const AREA_SCREENSHOT_SHORTCUT = "Ctrl+Alt+S (or Ctrl+Shift+S)";





interface PendingClipboardImage {
  placeholder: string;
  caption: string;
  fileName: string;
}

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
  blockId?: number;
  sourceText: string;
  title: string;
  dueDate: string;
  priority: string;
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

function buildPayload(form: NoteFormState) {
  const trimmedTaskId = form.taskId.trim();
  const trimmedCollectionId = form.collectionId.trim();
  return {
    title: form.title.trim(),
    contentType: form.contentType,
    taskId: trimmedTaskId ? Number(trimmedTaskId) : null,
    collectionId: trimmedCollectionId ? Number(trimmedCollectionId) : null,
    tags: parseTags(form.tags),
    body: form.body,
  };
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
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [draftBlocks, setDraftBlocks] = useState<DraftNoteBlock[]>(() => blocksFromBody(""));
  const [showRawBody, setShowRawBody] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);
  const [versionHistoryNoteId, setVersionHistoryNoteId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [attachmentCaptions, setAttachmentCaptions] = useState<
    Record<number, string>
  >({});
  const [screenshotMessages, setScreenshotMessages] = useState<
    Record<number, { kind: "error" | "success"; text: string }>
  >({});
  const [screenshotNoteMessage, setScreenshotNoteMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [clipboardImageMessage, setClipboardImageMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [pendingClipboardImages, setPendingClipboardImages] = useState<
    PendingClipboardImage[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariableState>({ taskTitle: '', date: new Date().toISOString().slice(0, 10), area: '', priority: '', dueDate: '' });
  const [convertTaskModal, setConvertTaskModal] = useState<ConvertTaskModalState | null>(null);
  const [aiReviewSuggestion, setAiReviewSuggestion] = useState<NoteAiGenerationRecord | null>(null);
  const [capturingNoteId, setCapturingNoteId] = useState<number | null>(null);
  const [isCreatingScreenshotNote, setIsCreatingScreenshotNote] =
    useState(false);
  const screenshotFileInputs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const noteFormTitleRef = useRef<HTMLHeadingElement | null>(null);
  const noteTitleInputRef = useRef<HTMLInputElement | null>(null);
  const newNoteButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasCreateDrawerOpenRef = useRef(false);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [cropOverlay, setCropOverlay] = useState<CropOverlayState | null>(null);
  const cropOverlayRef = useRef<CropOverlayState | null>(null);
  const screenshotNoteHandlerRef = useRef<() => Promise<void>>(async () => undefined);

  const templatesQuery = useNoteTemplatesQuery();
  const collectionsQuery = useNoteCollectionsQuery();
  const savedViewsQuery = useNoteSavedViewsQuery();
  const settingsQuery = useSettingsQuery(true);
  const aiGenerationsQuery = useNoteAiGenerationsQuery(editingNoteId ?? 0, editingNoteId !== null);
  const noteVersionsQuery = useNoteVersionsQuery(versionHistoryNoteId ?? 0, versionHistoryNoteId !== null);
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
    size: 100,
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
  const isUploadPending = uploadScreenshot.isPending;
  const isCapturePending = capturingNoteId !== null || isCreatingScreenshotNote;
  const screenshotNoteTaskId =
    linkedTaskId || (editingNoteId === null ? form.taskId.trim() : "");
  const activeForm =
    editingNoteId === null && linkedTaskId && form.taskId.trim() === ""
      ? { ...form, taskId: linkedTaskId }
      : form;
  const effectiveBody = bodyFromBlocks(draftBlocks) || activeForm.body;
  const settings = settingsQuery.data?.data as Record<string, unknown> | undefined;
  const aiFeaturesEnabled = settings?.aiFeaturesEnabled === true;
  const aiGenerations = useMemo<NoteAiGenerationRecord[]>(
    () => (Array.isArray(aiGenerationsQuery.data?.data) ? aiGenerationsQuery.data.data : []),
    [aiGenerationsQuery.data],
  );
  const noteVersions = useMemo<NoteVersionRecord[]>(
    () => (Array.isArray(noteVersionsQuery.data?.data) ? noteVersionsQuery.data.data : []),
    [noteVersionsQuery.data],
  );
  const selectedVersion = useMemo(() => noteVersions.find((version) => version.id === selectedVersionId) ?? noteVersions[0] ?? null, [noteVersions, selectedVersionId]);
  const versionHistoryNote = useMemo(() => notes.find((note) => note.id === versionHistoryNoteId) ?? null, [notes, versionHistoryNoteId]);
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


  const openConvertTaskModal = (sourceText: string, blockId?: number) => {
    if (editingNoteId === null) {
      setClipboardImageMessage({ kind: "error", text: "Save the note before converting note content into a task." });
      return;
    }
    const trimmed = sourceText.trim();
    setConvertTaskModal({ noteId: editingNoteId, blockId, sourceText: trimmed, title: trimmed.slice(0, 255), dueDate: "", priority: "", area: "PERSONAL", effort: "MEDIUM", parentTaskId: "" });
  };

  const submitConvertTask = () => {
    if (!convertTaskModal) return;
    convertNoteToTask.mutate({
      noteId: convertTaskModal.noteId,
      blockId: convertTaskModal.blockId,
      body: {
        title: convertTaskModal.title,
        selectedText: convertTaskModal.sourceText,
        dueDate: convertTaskModal.dueDate || null,
        priority: convertTaskModal.priority || null,
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

    const payload = { ...buildPayload(activeForm), body: effectiveBody };
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

  const setScreenshotMessage = (
    noteId: number,
    kind: "error" | "success",
    text: string,
  ) => {
    setScreenshotMessages((current) => ({
      ...current,
      [noteId]: { kind, text },
    }));
  };

  const getCropPoint = (event: PointerEvent<HTMLImageElement>): CropPoint | null => {
    if (!cropOverlay || !cropImageRef.current) return null;

    const bounds = cropImageRef.current.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return null;

    return {
      x: Math.min(
        cropOverlay.width,
        Math.max(0, ((event.clientX - bounds.left) / bounds.width) * cropOverlay.width),
      ),
      y: Math.min(
        cropOverlay.height,
        Math.max(0, ((event.clientY - bounds.top) / bounds.height) * cropOverlay.height),
      ),
    };
  };

  const getNormalizedSelection = (selection: CropSelection | null) => {
    if (!selection) return null;

    const left = Math.min(selection.start.x, selection.end.x);
    const top = Math.min(selection.start.y, selection.end.y);
    const width = Math.abs(selection.end.x - selection.start.x);
    const height = Math.abs(selection.end.y - selection.start.y);

    if (width < 1 || height < 1) return null;
    return { left, top, width, height };
  };

  const cancelCropOverlay = (message = "Screenshot area selection was cancelled.") => {
    setCropOverlay((current) => {
      current?.reject(new Error(message));
      return null;
    });
  };

  const confirmCropOverlay = async () => {
    if (!cropOverlay) return;

    const selection = getNormalizedSelection(cropOverlay.selection);
    if (!selection) return;

    try {
      const sourceImage = new Image();
      sourceImage.src = cropOverlay.imageSrc;
      await sourceImage.decode();

      const cropWidth = Math.max(1, Math.round(selection.width));
      const cropHeight = Math.max(1, Math.round(selection.height));
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the screenshot crop canvas.");

      context.drawImage(
        sourceImage,
        Math.round(selection.left),
        Math.round(selection.top),
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not convert the cropped screenshot to PNG.");

      cropOverlay.resolve({
        file: new File([blob], cropOverlay.fileName, { type: "image/png" }),
        width: cropWidth,
        height: cropHeight,
      });
      setCropOverlay(null);
    } catch (error) {
      cropOverlay.reject(error);
      setCropOverlay(null);
    }
  };

  const captureScreenshotFile = async (
    fileName: string,
  ): Promise<{ file: File; width: number; height: number }> => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error(SCREEN_CAPTURE_UNAVAILABLE_MESSAGE);
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const [track] = stream.getVideoTracks();
      if (!track)
        throw new Error("No video track was returned from screen capture.");

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve();
          return;
        }
        video.addEventListener("loadeddata", () => resolve(), { once: true });
      });

      const settings = track.getSettings();
      const width = video.videoWidth || settings.width || 1;
      const height = video.videoHeight || settings.height || 1;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the screenshot canvas.");
      context.drawImage(video, 0, 0, width, height);

      const imageSrc = canvas.toDataURL("image/png");
      return await new Promise<{ file: File; width: number; height: number }>(
        (resolve, reject) => {
          setCropOverlay({
            fileName,
            imageSrc,
            width,
            height,
            selection: null,
            isDragging: false,
            resolve,
            reject,
          });
        },
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "AbortError")
      ) {
        throw new Error(SCREEN_CAPTURE_DENIED_MESSAGE, { cause: error });
      }
      throw error;
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  const extractCreatedNoteId = (data: unknown): number | null => {
    if (data && typeof data === "object" && "id" in data) {
      const id = Number((data as { id?: unknown }).id);
      return Number.isFinite(id) ? id : null;
    }
    return null;
  };

  const getClipboardImageFile = (
    clipboardData: DataTransfer,
  ): File | null => {
    const files = Array.from(clipboardData.files).find((file) =>
      SUPPORTED_CLIPBOARD_IMAGE_MIME_TYPES.has(file.type),
    );
    if (files) return files;

    const item = Array.from(clipboardData.items).find(
      (clipboardItem) =>
        clipboardItem.kind === "file" &&
        SUPPORTED_CLIPBOARD_IMAGE_MIME_TYPES.has(clipboardItem.type),
    );
    return item?.getAsFile() ?? null;
  };

  const buildClipboardReference = (
    attachment: NoteAttachmentRecord,
    fallbackCaption: string,
    contentType = activeForm.contentType,
  ) => {
    const caption = attachment.caption?.trim() || fallbackCaption;
    const fileName = attachment.fileName;
    const downloadUrl = attachment.downloadUrl?.trim() || null;
    const label = caption || fileName;

    if (contentType === "MARKDOWN" && downloadUrl) {
      return `![${label}](${downloadUrl})`;
    }

    return downloadUrl
      ? `[Screenshot: ${label} (${fileName})] ${downloadUrl}`
      : `[Screenshot: ${label} (${fileName})]`;
  };

  const insertReferenceIntoBody = (
    body: string,
    reference: string,
    selectionStart?: number | null,
    selectionEnd?: number | null,
  ) => {
    const start = Math.max(0, Math.min(selectionStart ?? body.length, body.length));
    const end = Math.max(start, Math.min(selectionEnd ?? start, body.length));
    const prefix = body.slice(0, start);
    const suffix = body.slice(end);
    const spacingBefore = prefix && !prefix.endsWith("\n") ? "\n" : "";
    const spacingAfter = suffix && !suffix.startsWith("\n") ? "\n" : "";

    return `${prefix}${spacingBefore}${reference}${spacingAfter}${suffix}`;
  };

  const moveBodyCursorAfterReference = (reference: string) => {
    window.setTimeout(() => {
      const body = noteBodyRef.current?.value ?? "";
      const referenceIndex = body.indexOf(reference);
      const cursorPosition =
        referenceIndex === -1 ? body.length : referenceIndex + reference.length;

      noteBodyRef.current?.focus();
      noteBodyRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const handleBodyPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImage = getClipboardImageFile(event.clipboardData);
    if (!pastedImage) return;

    event.preventDefault();
    if (isBusy || isUploadPending) return;

    const caption = `Pasted screenshot - ${new Date().toLocaleString()}`;
    const pendingImage: PendingClipboardImage = {
      placeholder: PASTED_SCREENSHOT_PENDING_REFERENCE,
      caption,
      fileName: pastedImage.name || "pasted-screenshot",
    };
    const selectionStart = event.currentTarget.selectionStart;
    const selectionEnd = event.currentTarget.selectionEnd;
    const formWithLinkedTask = activeForm;
    const bodyWithPendingReference = insertReferenceIntoBody(
      formWithLinkedTask.body,
      pendingImage.placeholder,
      selectionStart,
      selectionEnd,
    );
    const formWithPendingReference = {
      ...formWithLinkedTask,
      body: bodyWithPendingReference,
    };
    let noteId = editingNoteId;

    setPendingClipboardImages((current) => [...current, pendingImage]);
    setForm(formWithPendingReference);
    moveBodyCursorAfterReference(pendingImage.placeholder);
    setClipboardImageMessage({
      kind: "success",
      text: "Pasted image added to the note body. Uploading...",
    });

    try {
      if (noteId === null) {
        if (!formWithPendingReference.title.trim()) {
          setClipboardImageMessage({
            kind: "error",
            text: "Enter a note title before pasting an image into a new note.",
          });
          return;
        }

        const createResult = await createNote.mutateAsync(
          buildPayload(formWithPendingReference),
        );
        if (!createResult.ok) {
          setClipboardImageMessage({
            kind: "error",
            text: `Note creation failed: ${createResult.error?.message ?? "Unable to create note for pasted image."}`,
          });
          return;
        }

        noteId = extractCreatedNoteId(createResult.data);
        if (noteId === null) {
          setClipboardImageMessage({
            kind: "error",
            text: "Note creation failed: the response did not include the new note id.",
          });
          return;
        }
        setEditingNoteId(noteId);
      }

      const uploadResult = await uploadScreenshot.mutateAsync({
        noteId,
        file: pastedImage,
        caption,
        source: "clipboard",
      });
      if (!uploadResult.ok) {
        setClipboardImageMessage({
          kind: "error",
          text: uploadResult.error?.message ?? "Clipboard image upload failed.",
        });
        return;
      }

      const attachment = uploadResult.data;
      if (!attachment) {
        setClipboardImageMessage({
          kind: "error",
          text: "Clipboard image upload failed: the response did not include attachment metadata.",
        });
        return;
      }

      const finalReference = buildClipboardReference(
        attachment,
        caption,
        formWithPendingReference.contentType,
      );
      const bodyWithFinalReference = bodyWithPendingReference.replace(
        pendingImage.placeholder,
        finalReference,
      );
      const updatedForm = {
        ...formWithPendingReference,
        body: bodyWithFinalReference,
      };

      setForm(updatedForm);
      moveBodyCursorAfterReference(finalReference);
      setPendingClipboardImages((current) =>
        current.filter((image) => image !== pendingImage),
      );

      const updateResult = await updateNote.mutateAsync({
        id: noteId,
        body: buildPayload(updatedForm),
      });
      if (!updateResult.ok) {
        setClipboardImageMessage({
          kind: "error",
          text: `Pasted image uploaded, but the note body still has the pending placeholder: ${updateResult.error?.message ?? "Unable to update note body."}`,
        });
        return;
      }

      setClipboardImageMessage({
        kind: "success",
        text: "Pasted image uploaded and inserted into the note body.",
      });
    } catch (error) {
      setClipboardImageMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Clipboard image upload failed.",
      });
    }
  };

  const handleScreenshotNote = async () => {
    const taskId = Number(screenshotNoteTaskId);
    if (
      !Number.isFinite(taskId) ||
      isBusy ||
      isUploadPending ||
      isCapturePending
    )
      return;

    setIsCreatingScreenshotNote(true);
    setScreenshotNoteMessage({
      kind: "success",
      text: `Choose a screen, window, or tab, then drag to crop the area. Shortcut: ${AREA_SCREENSHOT_SHORTCUT}.`,
    });

    let createdNoteId: number | null = null;
    try {
      const captured = await captureScreenshotFile(
        `task-${taskId}-screenshot-${Date.now()}.png`,
      );
      const createResult = await createNote.mutateAsync({
        taskId,
        title: `Screenshot - ${new Date().toLocaleString()}`,
        contentType: "PLAIN_TEXT",
        tags: [],
        body: SCREENSHOT_NOTE_BODY,
      });

      if (!createResult.ok) {
        setScreenshotNoteMessage({
          kind: "error",
          text: `Note creation failed: ${createResult.error?.message ?? "Unable to create screenshot note."}`,
        });
        return;
      }

      createdNoteId = extractCreatedNoteId(createResult.data);
      if (createdNoteId === null) {
        setScreenshotNoteMessage({
          kind: "error",
          text: "Note creation failed: the response did not include the new note id.",
        });
        return;
      }

      const uploadResult = await uploadScreenshot.mutateAsync({
        noteId: createdNoteId,
        file: captured.file,
        caption: SCREENSHOT_NOTE_UPLOAD_CAPTION,
        source: "browser-screen-capture",
        width: captured.width,
        height: captured.height,
      });

      if (!uploadResult.ok) {
        setScreenshotNoteMessage({
          kind: "error",
          text: `Screenshot upload failed for note #${createdNoteId}: ${uploadResult.error?.message ?? "Unable to upload screenshot."}`,
        });
        return;
      }

      setScreenshotNoteMessage({
        kind: "success",
        text: `Screenshot note #${createdNoteId} created and uploaded.`,
      });
    } catch (error) {
      setScreenshotNoteMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Screenshot note failed.",
      });
    } finally {
      if (createdNoteId !== null) await notesQuery.refetch();
      setIsCreatingScreenshotNote(false);
    }
  };

  const handleTakeScreenshot = async (note: NoteRecord) => {
    if (isUploadPending || isCapturePending) return;

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenshotMessage(
        note.id,
        "error",
        SCREEN_CAPTURE_UNAVAILABLE_MESSAGE,
      );
      return;
    }

    setCapturingNoteId(note.id);
    setScreenshotMessage(
      note.id,
      "success",
      "Choose a screen, window, or tab, then drag to crop the area.",
    );

    try {
      const captured = await captureScreenshotFile(
        `note-${note.id}-screenshot-${Date.now()}.png`,
      );
      const caption = attachmentCaptions[note.id]?.trim() || note.title.trim();

      uploadScreenshot.mutate(
        {
          noteId: note.id,
          file: captured.file,
          caption,
          source: "browser-screen-capture",
          width: captured.width,
          height: captured.height,
        },
        {
          onSuccess: (result) => {
            if (!result.ok) {
              setScreenshotMessage(
                note.id,
                "error",
                result.error?.message ?? "Screenshot upload failed.",
              );
              return;
            }
            screenshotFileInputs.current[note.id]?.form?.reset();
            setAttachmentCaptions((current) => ({ ...current, [note.id]: "" }));
            setScreenshotMessage(
              note.id,
              "success",
              "Screenshot captured and uploaded.",
            );
          },
          onError: () =>
            setScreenshotMessage(note.id, "error", "Screenshot upload failed."),
        },
      );
    } catch (error) {
      setScreenshotMessage(
        note.id,
        "error",
        error instanceof Error ? error.message : "Screenshot capture failed.",
      );
    } finally {
      setCapturingNoteId(null);
    }
  };

  const handleCropPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    const point = getCropPoint(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setCropOverlay((current) =>
      current
        ? {
            ...current,
            selection: { start: point, end: point },
            isDragging: true,
          }
        : current,
    );
  };

  const handleCropPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const point = getCropPoint(event);
    if (!point) return;

    setCropOverlay((current) =>
      current?.isDragging && current.selection
        ? { ...current, selection: { ...current.selection, end: point } }
        : current,
    );
  };

  const handleCropPointerUp = (event: PointerEvent<HTMLImageElement>) => {
    const point = getCropPoint(event);
    if (point) {
      setCropOverlay((current) =>
        current?.selection
          ? {
              ...current,
              selection: { ...current.selection, end: point },
              isDragging: false,
            }
          : current,
      );
      return;
    }

    setCropOverlay((current) =>
      current ? { ...current, isDragging: false } : current,
    );
  };

  const handleScreenshotSubmit = (
    event: FormEvent<HTMLFormElement>,
    note: NoteRecord,
  ) => {
    event.preventDefault();
    if (isUploadPending) return;

    const formData = new FormData(event.currentTarget);
    const file = formData.get("screenshot");
    if (!(file instanceof File) || file.size === 0) return;

    const caption = attachmentCaptions[note.id]?.trim() || note.title.trim();
    uploadScreenshot.mutate(
      { noteId: note.id, file, caption },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            setScreenshotMessage(
              note.id,
              "error",
              result.error?.message ?? "Image upload failed.",
            );
            return;
          }
          event.currentTarget.reset();
          setScreenshotMessage(note.id, "success", "Image uploaded.");
          setAttachmentCaptions((current) => ({ ...current, [note.id]: "" }));
        },
      },
    );
  };


  const openVersionHistory = (note: NoteRecord) => {
    setVersionHistoryNoteId(note.id);
    setSelectedVersionId(null);
  };

  const restoreSelectedVersion = () => {
    if (!versionHistoryNoteId || !selectedVersion) return;
    const confirmed = window.confirm(`Restore “${selectedVersion.title}” from ${formatDate(selectedVersion.createdAt)}? This will save the current note as a version first.`);
    if (!confirmed) return;
    restoreNoteVersion.mutate({ noteId: versionHistoryNoteId, versionId: selectedVersion.id }, {
      onSuccess: () => {
        const restored = selectedVersion;
        setForm({ ...noteToForm({ ...(versionHistoryNote ?? {} as NoteRecord), id: versionHistoryNoteId, title: restored.title, body: restored.body ?? "", contentType: restored.contentType, tags: restored.tags ?? [] }) });
        setDraftBlocks(blocksFromBody(restored.body ?? ""));
        setEditingNoteId(versionHistoryNoteId);
      },
    });
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
    screenshotNoteHandlerRef.current = handleScreenshotNote;
  });

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

  useEffect(() => {
    cropOverlayRef.current = cropOverlay;
  }, [cropOverlay]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && cropOverlayRef.current) {
        event.preventDefault();
        cancelCropOverlay();
        return;
      }

      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (isTypingTarget) return;

      const isScreenshotShortcut =
        event.ctrlKey &&
        event.key.toLowerCase() === "s" &&
        (event.altKey || event.shiftKey);

      if (!isScreenshotShortcut) return;

      event.preventDefault();
      void screenshotNoteHandlerRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="page-pattern notes-page">
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

      <div className={styles.workspace}>
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

      <div className={styles.browseEditGrid}>
      <section
        className={`page-card main-content-card ${styles.resultsPanel}`}
        aria-labelledby="notes-filters-title"
      >
        <div className="section-header">
          <div>
            <h3 id="notes-filters-title">
              {linkedTaskId
                ? `Notes for task #${linkedTaskId}`
                : "Browse notes"}
            </h3>
            <p className="muted">
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
            className={
              screenshotNoteMessage.kind === "error" ? "error-text" : "muted"
            }
            role={screenshotNoteMessage.kind === "error" ? "alert" : "status"}
          >
            {screenshotNoteMessage.text}
          </p>
        ) : null}

        <NotesState
          isLoading={notesQuery.isLoading}
          isError={Boolean(notesQuery.data && !notesQuery.data.ok)}
          isEmpty={!notesQuery.isLoading && notes.length === 0}
          hasActiveFilters={hasActiveNoteFilters}
          errorMessage={notesQueryErrorMessage}
          onClearFilters={clearNoteFilters}
          onNewNote={openNewNoteEditor}
        />


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

        <NotesResults viewMode={viewMode}>
        {viewMode === "sticky" ? (
          <div className={`panel ${styles.stickyBoard}`} aria-label="Sticky note board">
            {notes.map((note, index) => (
              <article key={note.id} className={`panel ${styles.stickyCard}`} style={{ left: note.positionX ?? 24 + (index % 3) * 280, top: note.positionY ?? 24 + Math.floor(index / 3) * 220, width: note.width ?? 250, minHeight: note.height ?? 170, zIndex: note.zIndex ?? index + 1, borderTop: `0.35rem solid ${note.color ?? "#facc15"}` }}>
                <p className="eyebrow">Sticky note #{getStickyNoteNumber(note)}</p>
                <h3>{note.title}</h3>
                <p className="muted">{note.collectionName ?? "No collection"} · Task {note.taskId ? taskTitleById.get(note.taskId) ?? `#${note.taskId}` : "none"} · Updated {formatDate(note.updatedAt)}</p>
                <CodePreview body={note.body.slice(0, 360)} contentType={note.contentType} />
                <NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} />
              </article>
            ))}
          </div>
        ) : null}

        {viewMode === "list" ? (
          <div className="stacked-list" aria-label="Fast scanning notes list">
            {notes.map((note) => (
              <article key={note.id} className={`panel ${styles.listCard}`}>
                <div className="section-header">
                  <div>
                    <h3>{note.title}</h3>
                    <p className="muted">{note.collectionName ?? "No collection"} · {humanizeContentType(note.contentType)} · {note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · Updated {formatDate(note.updatedAt)}</p>
                    <p>{note.body.replace(/\s+/g, " ").slice(0, 220)}{note.body.length > 220 ? "…" : ""}</p>
                  </div>
                  <NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} screenshotMode="inline" onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)} onScreenshotSubmit={handleScreenshotSubmit} screenshotMessage={screenshotMessages[note.id]} attachmentCaption={attachmentCaptions[note.id] ?? ""} onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))} screenshotInputRef={(element) => { screenshotFileInputs.current[note.id] = element; }} isUploadPending={isUploadPending} isCapturePending={isCapturePending} isCapturing={capturingNoteId === note.id} />
                </div>
                <div className="row compact-row">{note.tags?.map((tag) => <span key={tag} className="status-badge status-other">{tag}</span>)}</div>

                {note.attachments?.filter((attachment) => attachment.kind === "SCREENSHOT" && attachment.downloadUrl).map((attachment) => <figure key={attachment.id} className={`panel ${styles.attachmentFigure}`}><img src={attachment.downloadUrl!} alt={attachment.caption ?? attachment.fileName} className={styles.attachmentImage} /><figcaption className={`muted ${styles.attachmentCaption}`}>{attachment.caption ?? attachment.fileName} · <a href={attachment.downloadUrl!} target="_blank" rel="noreferrer">Open/download attachment</a></figcaption></figure>)}
              </article>
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
            screenshotInputRef={(noteId, element) => { screenshotFileInputs.current[noteId] = element; }}
            isUploadPending={isUploadPending}
            isCapturePending={isCapturePending}
            capturingNoteId={capturingNoteId}
          />
        ) : null}

        {viewMode === "timeline" ? (
          <div className="stacked-list" aria-label="Notes timeline">
            {Object.entries(groupedTimelineNotes).map(([date, dateNotes]) => (
              <section key={date} className={`panel ${styles.timelinePanel}`}>
                <h3>{date}</h3>
                {dateNotes.map((note) => <article key={note.id} className={`panel ${styles.timelineCard}`}><p className="eyebrow">Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}</p><h4>{note.title}</h4><p className="muted">{note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · {humanizeContentType(note.contentType)}</p><p>{note.body.replace(/\s+/g, " ").slice(0, 180)}{note.body.length > 180 ? "…" : ""}</p><NoteActions note={note} copied={copiedNoteId === note.id} onEdit={editNote} onCopy={copyBody} onVersionHistory={openVersionHistory} screenshotMode="compact" onTakeScreenshot={(selectedNote) => void handleTakeScreenshot(selectedNote)} onScreenshotSubmit={handleScreenshotSubmit} screenshotMessage={screenshotMessages[note.id]} attachmentCaption={attachmentCaptions[note.id] ?? ""} onAttachmentCaptionChange={(noteId, caption) => setAttachmentCaptions((current) => ({ ...current, [noteId]: caption }))} screenshotInputRef={(element) => { screenshotFileInputs.current[note.id] = element; }} isUploadPending={isUploadPending} isCapturePending={isCapturePending} isCapturing={capturingNoteId === note.id} /></article>)}
              </section>
            ))}
          </div>
        ) : null}        </NotesResults>

      </section>

      </div>
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

      {convertTaskModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="convert-task-title">
            <div className="section-header">
              <h3 id="convert-task-title">Convert to task</h3>
              <button type="button" onClick={() => setConvertTaskModal(null)}>Close</button>
            </div>
            <div className="config-panel">
              <label className="field-stack"><span>Title</span><input value={convertTaskModal.title} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, title: event.target.value } : current)} /></label>
              <label className="field-stack"><span>Due date</span><input type="date" value={convertTaskModal.dueDate} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, dueDate: event.target.value } : current)} /></label>
              <label className="field-stack"><span>Priority</span><select value={convertTaskModal.priority} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, priority: event.target.value } : current)}><option value="">Backlog</option><option value="NOT_STARTED">Not started</option><option value="IN_PROGRESS">In progress</option><option value="BLOCKED">Blocked</option><option value="WAITING">Waiting</option></select></label>
              <label className="field-stack"><span>Area</span><select value={convertTaskModal.area} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, area: event.target.value } : current)}><option value="PERSONAL">Personal</option><option value="WORK">Work</option><option value="STUDY">Study</option><option value="HEALTH">Health</option><option value="FAMILY">Family</option></select></label>
              <label className="field-stack"><span>Effort</span><select value={convertTaskModal.effort} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, effort: event.target.value } : current)}><option value="QUICK">Quick</option><option value="MEDIUM">Medium</option><option value="DEEP_WORK">Deep work</option><option value="LARGE">Large</option></select></label>
              <label className="field-stack"><span>Linked task parent</span><select value={convertTaskModal.parentTaskId} onChange={(event) => setConvertTaskModal((current) => current ? { ...current, parentTaskId: event.target.value } : current)}><option value="">No parent</option>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
              <p className="muted">Created from note text: {convertTaskModal.sourceText.slice(0, 160)}</p>
              <button type="button" className="button-primary" disabled={!convertTaskModal.title.trim() || convertNoteToTask.isPending} onClick={submitConvertTask}>Create linked task</button>
            </div>
          </div>
        </div>
      ) : null}

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
