import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QueryState } from "../components/QueryState";
import { CodePreview } from "../components/notes/CodePreview";
import { NoteBlockEditor, blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "../components/notes/NoteBlockEditor";
import type {
  NoteAttachmentRecord,
  NoteContentType,
  NoteRecord,
  NoteTemplateRecord,
} from "../components/notes/noteTypes";
import type { TaskRecord } from "../components/tasks/taskTypes";
import {
  latestResult,
  useNoteCollectionsQuery,
  useNoteMutations,
  useNoteTemplatesQuery,
  useNotesQuery,
  useTasksQuery,
} from "../hooks/useApiQueries";

const NOTE_CONTENT_TYPES: NoteContentType[] = [
  "PLAIN_TEXT",
  "MARKDOWN",
  "SHELL_COMMANDS",
  "XML",
  "JSON",
];
const EMPTY_FORM: NoteFormState = {
  title: "",
  contentType: "PLAIN_TEXT",
  taskId: "",
  collectionId: "",
  tags: "",
  body: "",
};
const SCREENSHOT_MAX_FILE_SIZE_BYTES = 5_242_880;
const SUPPORTED_SCREENSHOT_TYPES = "PNG, JPEG, or WebP";
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
const AREA_SCREENSHOT_SHORTCUT = "Ctrl+Alt+S (or Ctrl+Shift+S)";

interface CropPoint {
  x: number;
  y: number;
}

interface CropSelection {
  start: CropPoint;
  end: CropPoint;
}

interface CropOverlayState {
  fileName: string;
  imageSrc: string;
  width: number;
  height: number;
  selection: CropSelection | null;
  isDragging: boolean;
  resolve: (value: { file: File; width: number; height: number }) => void;
  reject: (reason?: unknown) => void;
}

interface NoteFormState {
  title: string;
  contentType: NoteContentType;
  taskId: string;
  collectionId: string;
  tags: string;
  body: string;
}

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

type NotesViewMode = 'sticky' | 'list' | 'table' | 'timeline';
type NoteSortBy = 'createdAt' | 'updatedAt' | 'displayOrder' | 'title' | 'task' | 'contentType';

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

function humanizeContentType(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(value: number): string {
  return `${value.toLocaleString()} bytes (${(value / 1024 / 1024).toFixed(1)} MiB)`;
}

function getStickyNoteNumber(note: NoteRecord): number {
  return note.displayOrder ?? 0;
}

function noteToForm(note: NoteRecord): NoteFormState {
  return {
    title: note.title,
    contentType: note.contentType,
    taskId: note.taskId == null ? "" : String(note.taskId),
    collectionId: note.collectionId == null ? "" : String(note.collectionId),
    tags: note.tags?.join(", ") ?? "",
    body: note.body,
  };
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
  const [viewMode, setViewMode] = useState<NotesViewMode>("sticky");
  const [sortBy, setSortBy] = useState<NoteSortBy>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [contentTypeFilter, setContentTypeFilter] = useState<
    NoteContentType | "all"
  >("all");
  const [tagFilter, setTagFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [draftBlocks, setDraftBlocks] = useState<DraftNoteBlock[]>(() => blocksFromBody(""));
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);
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
  const [templateVariables, setTemplateVariables] = useState<TemplateVariableState>({ taskTitle: '', date: new Date().toISOString().slice(0, 10), area: '', priority: '', dueDate: '' });
  const [convertTaskModal, setConvertTaskModal] = useState<ConvertTaskModalState | null>(null);
  const [capturingNoteId, setCapturingNoteId] = useState<number | null>(null);
  const [isCreatingScreenshotNote, setIsCreatingScreenshotNote] =
    useState(false);
  const screenshotFileInputs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [cropOverlay, setCropOverlay] = useState<CropOverlayState | null>(null);
  const cropOverlayRef = useRef<CropOverlayState | null>(null);
  const screenshotNoteHandlerRef = useRef<() => Promise<void>>(async () => undefined);

  const templatesQuery = useNoteTemplatesQuery();
  const collectionsQuery = useNoteCollectionsQuery();
  const notesQuery = useNotesQuery({
    q: search,
    contentType: contentTypeFilter,
    taskId: linkedTaskId,
    collectionId: collectionFilter,
    tags: tagFilter,
    sortBy,
    sortDirection,
    size: 100,
  });
  const tasksQuery = useTasksQuery("active");
  const { createNote, createNoteFromTemplate, updateNote, deleteNote, uploadScreenshot, convertNoteToTask, createTaskLink, deleteTaskLink } =
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
  const collections = collectionsQuery.data?.data ?? [];

  const notes = useMemo(() => {
    const records = notesQuery.data?.data ?? [];
    if (!linkedTaskId) return records;

    return [...records].sort((first, second) => {
      const orderDelta =
        getStickyNoteNumber(first) - getStickyNoteNumber(second);
      return orderDelta === 0 ? first.id - second.id : orderDelta;
    });
  }, [linkedTaskId, notesQuery.data]);
  const recentNotes = useMemo(() => [...notes].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()).slice(0, 5), [notes]);
  const taskLinkedNotes = useMemo(() => notes.filter((note) => note.taskId || (note.taskLinks?.length ?? 0) > 0).slice(0, 5), [notes]);
  const archivedNotes = useMemo(() => notes.filter((note) => note.tags?.includes("archived")).slice(0, 5), [notes]);
  const isBusy =
    createNote.isPending || createNoteFromTemplate.isPending || updateNote.isPending || deleteNote.isPending || convertNoteToTask.isPending || createTaskLink.isPending || deleteTaskLink.isPending;
  const isUploadPending = uploadScreenshot.isPending;
  const isCapturePending = capturingNoteId !== null || isCreatingScreenshotNote;
  const screenshotNoteTaskId =
    linkedTaskId || (editingNoteId === null ? form.taskId.trim() : "");
  const activeForm =
    editingNoteId === null && linkedTaskId && form.taskId.trim() === ""
      ? { ...form, taskId: linkedTaskId }
      : form;
  const effectiveBody = bodyFromBlocks(draftBlocks) || activeForm.body;
  const templates = useMemo<NoteTemplateRecord[]>(() => templatesQuery.data?.data ?? [], [templatesQuery.data]);
  const selectedTemplate = templates.find((template) => String(template.id) === selectedTemplateId) ?? null;
  const renderedTemplatePreview = selectedTemplate ? TEMPLATE_VARIABLE_KEYS.reduce((content, key) => content.replaceAll(`{{${key}}}`, templateVariables[key]), selectedTemplate.content) : '';
  const canCreateFromTemplate = Boolean(selectedTemplate) && !isBusy;
  const canSubmit =
    activeForm.title.trim().length > 0 &&
    effectiveBody.trim().length > 0 &&
    !isBusy;
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

  const noteStatus = (note: NoteRecord) => {
    if (editingNoteId === note.id) return "Editing";
    if ((note.attachments?.length ?? 0) > 0) return "Has attachments";
    if ((note.taskLinks?.length ?? 0) > 0 || note.taskId) return "Linked";
    return "Unlinked";
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

  const resetForm = () => {
    setForm(emptyFormForTask(linkedTaskId));
    setDraftBlocks(blocksFromBody(""));
    setEditingNoteId(null);
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Knowledge base</p>
          <h2>Notes</h2>
          <p>
            Capture searchable notes, commands, JSON snippets, and reference
            material without overloading task descriptions.
          </p>
        </div>
        <div className="row compact-row">
          {screenshotNoteTaskId ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => void handleScreenshotNote()}
              disabled={isBusy || isUploadPending || isCapturePending}
            >
              {isCreatingScreenshotNote
                ? "Creating screenshot note..."
                : "Capture area note"}
            </button>
          ) : null}
          {linkedTaskId ? (
            <Link className="secondary-action" to="/notes">
              View all notes
            </Link>
          ) : null}
          <button
            type="button"
            className="button-primary"
            onClick={resetForm}
            disabled={isBusy || editingNoteId === null}
          >
            New note
          </button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(14rem, 18rem) 1fr", gap: "var(--space-4)", alignItems: "start" }}>
        <aside className="page-card" aria-label="Notes navigation" style={{ position: "sticky", top: "var(--space-4)" }}>
          <p className="eyebrow">Notes navigation</p>
          <h3>Collections</h3>
          <button type="button" className={!collectionFilter ? "button-primary" : "secondary-action"} onClick={() => setCollectionFilter("")}>All notes</button>
          <div className="stacked-list" style={{ marginTop: "var(--space-3)" }}>
            {collections.map((collection) => (
              <button key={collection.id} type="button" className={collectionFilter === String(collection.id) ? "button-primary" : "secondary-action"} onClick={() => setCollectionFilter(String(collection.id))} style={{ justifyContent: "flex-start", borderLeft: `0.35rem solid ${collection.color ?? "#38bdf8"}` }}>
                {collection.icon ?? "📁"} {collection.name}
              </button>
            ))}
          </div>
          <h4>Recent notes</h4>
          {recentNotes.map((note) => <button key={note.id} type="button" className="link-button" onClick={() => { setEditingNoteId(note.id); setForm(noteToForm(note)); setDraftBlocks(blocksFromBody(note.body ?? "")); }}>{note.title}</button>)}
          <h4>Task-linked</h4>
          {taskLinkedNotes.length ? taskLinkedNotes.map((note) => <p key={note.id} className="muted">{note.title}</p>) : <p className="muted">No task-linked notes.</p>}
          <h4>Archived</h4>
          {archivedNotes.length ? archivedNotes.map((note) => <p key={note.id} className="muted">{note.title}</p>) : <p className="muted">Tag notes with archived to show them here.</p>}
        </aside>

      <section
        className="page-card main-content-card"
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
          <button
            type="button"
            className="secondary-action"
            onClick={() => notesQuery.refetch()}
            disabled={notesQuery.isFetching}
          >
            {notesQuery.isFetching ? "Loading..." : "Reload notes"}
          </button>
        </div>

        <div className="row" style={{ alignItems: "end", flexWrap: "wrap" }}>
          <label
            className="field-stack"
            htmlFor="noteSearch"
            style={{ flex: "1 1 18rem" }}
          >
            <span>Search</span>
            <input
              id="noteSearch"
              type="search"
              value={search}
              placeholder="Search title or body"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label
            className="field-stack"
            htmlFor="noteTagFilter"
            style={{ flex: "1 1 16rem" }}
          >
            <span>Tags</span>
            <input
              id="noteTagFilter"
              value={tagFilter}
              placeholder="Filter by tag, e.g. backend"
              onChange={(event) => setTagFilter(event.target.value)}
            />
          </label>
          <label className="field-stack" htmlFor="noteCollectionFilter" style={{ flex: "0 1 16rem" }}>
            <span>Collection</span>
            <select id="noteCollectionFilter" value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)}>
              <option value="">All collections</option>
              {collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
            </select>
          </label>
          <label
            className="field-stack"
            htmlFor="noteContentTypeFilter"
            style={{ flex: "0 1 16rem" }}
          >
            <span>Content type</span>
            <select
              id="noteContentTypeFilter"
              value={contentTypeFilter}
              onChange={(event) =>
                setContentTypeFilter(
                  event.target.value as NoteContentType | "all",
                )
              }
            >
              <option value="all">All types</option>
              {NOTE_CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanizeContentType(type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row compact-row" role="tablist" aria-label="Note view modes" style={{ marginTop: "var(--space-4)" }}>
          {([
            ["sticky", "Sticky board"],
            ["list", "List"],
            ["table", "Table"],
            ["timeline", "Timeline"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              className={viewMode === mode ? "button-primary" : "secondary-action"}
              onClick={() => setViewMode(mode)}
            >
              {label}
            </button>
          ))}
          <label className="field-stack" htmlFor="noteSortBy" style={{ minWidth: "12rem" }}>
            <span>Sort by</span>
            <select id="noteSortBy" value={sortBy} onChange={(event) => setSortBy(event.target.value as NoteSortBy)}>
              <option value="updatedAt">Updated date</option>
              <option value="createdAt">Created date</option>
              <option value="displayOrder">Sticky order</option>
              <option value="title">Title</option>
              <option value="task">Task</option>
              <option value="contentType">Content type</option>
            </select>
          </label>
          <label className="field-stack" htmlFor="noteSortDirection" style={{ minWidth: "10rem" }}>
            <span>Direction</span>
            <select id="noteSortDirection" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

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

        <QueryState
          isLoading={notesQuery.isLoading}
          isError={Boolean(notesQuery.data && !notesQuery.data.ok)}
          isEmpty={!notesQuery.isLoading && notes.length === 0}
          emptyMessage="No notes match the current filters."
        />

        {viewMode === "sticky" ? (
          <div className="panel" aria-label="Sticky note board" style={{ position: "relative", minHeight: "34rem", overflow: "auto", marginTop: "var(--space-4)", background: "linear-gradient(135deg, rgba(250, 204, 21, 0.14), rgba(14, 165, 233, 0.08))" }}>
            {notes.map((note, index) => (
              <article key={note.id} className="panel" style={{ position: "absolute", left: note.positionX ?? 24 + (index % 3) * 280, top: note.positionY ?? 24 + Math.floor(index / 3) * 220, width: note.width ?? 250, minHeight: note.height ?? 170, zIndex: note.zIndex ?? index + 1, borderTop: `0.35rem solid ${note.color ?? "#facc15"}`, padding: "var(--space-4)" }}>
                <p className="eyebrow">Sticky note #{getStickyNoteNumber(note)}</p>
                <h3>{note.title}</h3>
                <p className="muted">{note.collectionName ?? "No collection"} · Task {note.taskId ? taskTitleById.get(note.taskId) ?? `#${note.taskId}` : "none"} · Updated {formatDate(note.updatedAt)}</p>
                <CodePreview body={note.body.slice(0, 360)} contentType={note.contentType} />
                <div className="row compact-row" style={{ marginTop: "var(--space-3)" }}>
                  <button type="button" onClick={() => { setEditingNoteId(note.id); setForm(noteToForm(note)); setDraftBlocks(blocksFromBody(note.body ?? "")); }}>Edit</button>
                  <button type="button" onClick={() => copyBody(note)}>{copiedNoteId === note.id ? "Copied" : "Copy"}</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {viewMode === "list" ? (
          <div className="stacked-list" aria-label="Fast scanning notes list">
            {notes.map((note) => (
              <article key={note.id} className="panel" style={{ padding: "var(--space-4)", marginTop: "var(--space-3)" }}>
                <div className="section-header">
                  <div>
                    <h3>{note.title}</h3>
                    <p className="muted">{note.collectionName ?? "No collection"} · {humanizeContentType(note.contentType)} · {note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · Updated {formatDate(note.updatedAt)}</p>
                    <p>{note.body.replace(/\s+/g, " ").slice(0, 220)}{note.body.length > 220 ? "…" : ""}</p>
                  </div>
                  <div className="row compact-row"><button type="button" onClick={() => { setEditingNoteId(note.id); setForm(noteToForm(note)); setDraftBlocks(blocksFromBody(note.body ?? "")); }}>Edit</button><button type="button" onClick={() => copyBody(note)}>{copiedNoteId === note.id ? "Copied" : "Copy"}</button></div>
                </div>
                <div className="row compact-row">{note.tags?.map((tag) => <span key={tag} className="status-badge status-other">{tag}</span>)}</div>
                <form className="panel" onSubmit={(event) => handleScreenshotSubmit(event, note)} style={{ margin: "var(--space-3) 0 0", padding: "var(--space-3)" }}>
                  <div className="section-header" style={{ alignItems: "end", gap: "var(--space-3)" }}>
                    <p className="muted" id={`screenshot-help-${note.id}`}>Attach {SUPPORTED_SCREENSHOT_TYPES}. Limit: {formatBytes(SCREENSHOT_MAX_FILE_SIZE_BYTES)}.</p>
                    <div className="row compact-row"><button type="button" className="secondary-action" onClick={() => void handleTakeScreenshot(note)} disabled={isUploadPending || isCapturePending}>{capturingNoteId === note.id ? "Capturing..." : "Take area screenshot"}</button><button type="submit" className="secondary-action" disabled={isUploadPending || isCapturePending}>{isUploadPending ? "Uploading..." : "Attach image"}</button></div>
                  </div>
                  <div className="row" style={{ alignItems: "end", flexWrap: "wrap" }}><label className="field-stack" htmlFor={`screenshot-file-${note.id}`} style={{ flex: "1 1 16rem" }}><span>Image file</span><input id={`screenshot-file-${note.id}`} name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={`screenshot-help-${note.id}`} disabled={isUploadPending} ref={(element) => { screenshotFileInputs.current[note.id] = element; }} /></label><label className="field-stack" htmlFor={`screenshot-caption-${note.id}`} style={{ flex: "1 1 16rem" }}><span>Caption</span><input id={`screenshot-caption-${note.id}`} value={attachmentCaptions[note.id] ?? ""} placeholder={`Defaults to “${note.title}”`} onChange={(event) => setAttachmentCaptions((current) => ({ ...current, [note.id]: event.target.value }))} disabled={isUploadPending} /></label></div>
                  {screenshotMessages[note.id] ? <p className={screenshotMessages[note.id].kind === "error" ? "error-text" : "muted"} role={screenshotMessages[note.id].kind === "error" ? "alert" : "status"}>{screenshotMessages[note.id].text}</p> : null}
                </form>
                {note.attachments?.filter((attachment) => attachment.kind === "SCREENSHOT" && attachment.downloadUrl).map((attachment) => <figure key={attachment.id} className="panel" style={{ margin: "var(--space-3) 0 0", padding: "var(--space-3)" }}><img src={attachment.downloadUrl!} alt={attachment.caption ?? attachment.fileName} style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "var(--radius-md)" }} /><figcaption className="muted" style={{ marginTop: "var(--space-2)" }}>{attachment.caption ?? attachment.fileName} · <a href={attachment.downloadUrl!} target="_blank" rel="noreferrer">Open/download attachment</a></figcaption></figure>)}
              </article>
            ))}
          </div>
        ) : null}

        {viewMode === "table" ? (
          <div className="table-scroll" style={{ marginTop: "var(--space-4)", overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead><tr><th>Title</th><th>Task</th><th>Tags</th><th>Content type</th><th>Updated date</th><th>Attachments</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{notes.map((note) => <tr key={note.id}><td>{note.title}</td><td>{note.taskId ? taskTitleById.get(note.taskId) ?? `#${note.taskId}` : "—"}</td><td>{note.tags?.join(", ") || "—"}</td><td>{humanizeContentType(note.contentType)}</td><td>{formatDate(note.updatedAt)}</td><td>{note.attachments?.length ?? 0}</td><td>{noteStatus(note)}</td><td><button type="button" onClick={() => { setEditingNoteId(note.id); setForm(noteToForm(note)); setDraftBlocks(blocksFromBody(note.body ?? "")); }}>Edit</button></td></tr>)}</tbody>
            </table>
          </div>
        ) : null}

        {viewMode === "timeline" ? (
          <div className="stacked-list" aria-label="Notes timeline">
            {Object.entries(groupedTimelineNotes).map(([date, dateNotes]) => (
              <section key={date} className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-4)" }}>
                <h3>{date}</h3>
                {dateNotes.map((note) => <article key={note.id} className="panel" style={{ marginTop: "var(--space-3)", padding: "var(--space-3)" }}><p className="eyebrow">Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}</p><h4>{note.title}</h4><p className="muted">{note.taskId ? taskTitleById.get(note.taskId) ?? `Task #${note.taskId}` : "No task"} · {humanizeContentType(note.contentType)}</p><p>{note.body.replace(/\s+/g, " ").slice(0, 180)}{note.body.length > 180 ? "…" : ""}</p></article>)}
              </section>
            ))}
          </div>
        ) : null}
      </section>
      </div>

      <section
        className="page-card main-content-card"
        aria-labelledby="note-form-title"
        style={{ marginTop: "var(--space-6)" }}
      >
        <div className="section-header">
          <div>
            <h3 id="note-form-title">
              {editingNoteId === null ? "Create note" : "Edit note"}
            </h3>
            <p className="muted">
              Notes require a title, content type, and body. Task IDs link notes
              to tasks while keeping task descriptions separate.
            </p>
          </div>
          <div className="row compact-row" style={{ alignItems: "center" }}>
            {editingNoteId !== null && (
              <button type="button" onClick={resetForm} disabled={isBusy}>
                Cancel edit
              </button>
            )}
            <div className="field-stack" style={{ alignItems: "flex-end" }}>
              <button
                type="submit"
                form="note-form"
                className="button-primary"
                disabled={!canSubmit}
              >
                {isBusy ? "Saving..." : "Save note"}
              </button>
              {!canSubmit ? (
                <span className="muted">
                  Title and body are required before saving.
                </span>
              ) : null}
            </div>
          </div>
        </div>


        <div className="config-panel" style={{ marginBottom: "var(--space-4)" }}>
          <div className="section-header">
            <div>
              <h4>New from template</h4>
              <p className="muted">Pick a default template, preview the rendered note, and fill variables like task title, date, area, priority, and due date.</p>
            </div>
            <button type="button" className="button-primary" disabled={!canCreateFromTemplate} onClick={handleCreateFromTemplate}>
              {createNoteFromTemplate.isPending ? "Creating..." : "Create from template"}
            </button>
          </div>
          <div className="row" style={{ alignItems: "end", flexWrap: "wrap" }}>
            <label className="field-stack" style={{ flex: "1 1 16rem" }}>
              <span>Template</span>
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} disabled={templatesQuery.isLoading}>
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={String(template.id)}>{template.category ? `${template.category} · ` : ""}{template.name}</option>
                ))}
              </select>
            </label>
            {TEMPLATE_VARIABLE_KEYS.map((key) => (
              <label key={key} className="field-stack" style={{ flex: "1 1 10rem" }}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <input type={key.toLowerCase().includes("date") ? "date" : "text"} value={templateVariables[key]} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          {selectedTemplate ? (
            <div className="panel" style={{ marginTop: "var(--space-3)" }}>
              <strong>{selectedTemplate.name}</strong>
              <p className="muted">{selectedTemplate.description}</p>
              <pre className="text-block" style={{ whiteSpace: "pre-wrap" }}>{renderedTemplatePreview}</pre>
            </div>
          ) : null}
        </div>

        <form id="note-form" onSubmit={handleSubmit} className="config-panel">
          <div className="row" style={{ alignItems: "end", flexWrap: "wrap" }}>
            <label
              className="field-stack"
              htmlFor="noteTitle"
              style={{ flex: "1 1 18rem" }}
            >
              <span>Title</span>
              <input
                id="noteTitle"
                value={activeForm.title}
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label
              className="field-stack"
              htmlFor="noteContentType"
              style={{ flex: "0 1 16rem" }}
            >
              <span>Content type</span>
              <select
                id="noteContentType"
                value={activeForm.contentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contentType: event.target.value as NoteContentType,
                  }))
                }
              >
                {NOTE_CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanizeContentType(type)}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="field-stack"
              htmlFor="noteTaskId"
              style={{ flex: "0 1 12rem" }}
            >
              <span>Linked task (optional)</span>
              <select
                id="noteTaskId"
                value={activeForm.taskId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    taskId: event.target.value,
                  }))
                }
              >
                <option value="">No linked task</option>
                {availableTasks.map((task) => (
                  <option key={task.id} value={String(task.id)}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack" htmlFor="noteCollectionId" style={{ flex: "0 1 12rem" }}>
              <span>Collection</span>
              <select id="noteCollectionId" value={activeForm.collectionId} onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}>
                <option value="">No collection</option>
                {collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
              </select>
            </label>
            <label
              className="field-stack"
              htmlFor="noteTags"
              style={{ flex: "1 1 16rem" }}
            >
              <span>Tags</span>
              <input
                id="noteTags"
                value={activeForm.tags}
                placeholder="Comma-separated tags"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <NoteBlockEditor
            blocks={draftBlocks}
            onChange={(blocks) => {
              setDraftBlocks(blocks);
              setForm((current) => ({ ...current, body: bodyFromBlocks(blocks) }));
            }}
            disabled={isBusy}
            onConvertToTask={(block) => openConvertTaskModal(block.content ?? "")}
          />
          <div className="row compact-row">
            <button type="button" disabled={editingNoteId === null || availableTasks.length === 0 || isBusy} onClick={handleTaskMentionShortcut}>
              Link @task mention
            </button>
            <span className="muted">Type @task or /task in the note, select text, then link it to the current or first loaded task.</span>
          </div>
          <label className="field-stack" htmlFor="noteBody">
            <span>Fallback body / migration source</span>
            <textarea
              id="noteBody"
              className="text-block"
              rows={8}
              value={activeForm.body}
              ref={noteBodyRef}
              onPaste={(event) => void handleBodyPaste(event)}
              onChange={(event) => {
                const nextBody = event.target.value;
                setForm((current) => ({ ...current, body: nextBody }));
                setDraftBlocks(blocksFromBody(nextBody));
                if (editingNoteId !== null && /(^|\s)(@task|\/task)\b/i.test(nextBody)) {
                  const selectedTask = availableTasks.find((task) => String(task.id) === activeForm.taskId);
                  if (selectedTask && !notes.find((note) => note.id === editingNoteId)?.taskLinks?.some((link) => link.taskId === selectedTask.id)) {
                    linkMentionedTask(editingNoteId, selectedTask.id, selectedTask.title);
                  }
                }
              }}
              required
            />
          </label>
          {editingNoteId !== null && notes.find((note) => note.id === editingNoteId)?.taskLinks?.length ? (
            <div className="row compact-row" aria-label="Linked task chips">
              {notes.find((note) => note.id === editingNoteId)?.taskLinks?.map((link) => (
                <span key={link.id} className="status-badge status-other">
                  <Link to={`/tasks?focusTaskId=${encodeURIComponent(String(link.taskId))}`}>#{link.taskId} {link.taskTitle ?? "Task"}</Link>
                  <button type="button" onClick={() => deleteTaskLink.mutate({ noteId: editingNoteId, linkId: link.id })} disabled={isBusy}>×</button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="row compact-row">
            <button type="button" disabled={editingNoteId === null || !activeForm.body.trim()} onClick={() => {
              const textarea = noteBodyRef.current;
              const selected = textarea && textarea.selectionStart !== textarea.selectionEnd
                ? activeForm.body.slice(textarea.selectionStart, textarea.selectionEnd)
                : activeForm.body;
              openConvertTaskModal(selected);
            }}>Convert selected text to task</button>
            {editingNoteId === null ? <span className="muted">Save the note before converting selected text.</span> : null}
          </div>
          {clipboardImageMessage ? (
            <p
              className={
                clipboardImageMessage.kind === "error" ? "error-text" : "muted"
              }
              role={clipboardImageMessage.kind === "error" ? "alert" : "status"}
            >
              {clipboardImageMessage.text}
            </p>
          ) : null}
          {pendingClipboardImages.length > 0 ? (
            <div className="muted" role="status">
              <strong>Pending pasted screenshots</strong>
              <ul>
                {pendingClipboardImages.map((image, index) => (
                  <li key={`${image.fileName}-${image.caption}-${index}`}>
                    {image.placeholder} — {image.fileName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="save-bar">
            <div>
              <strong>
                {editingNoteId === null
                  ? "Ready to create"
                  : `Editing note #${editingNoteId}`}
              </strong>
              <p className="muted">
                Uses the shared API client against <code>/api/v1/notes</code>.
              </p>
            </div>
            <button
              type="submit"
              className="button-primary"
              disabled={!canSubmit}
            >
              {isBusy ? "Saving..." : "Save note"}
            </button>
          </div>
        </form>

        <QueryState
          isLoading={false}
          isError={Boolean(latestMutationResult && !latestMutationResult.ok)}
          isEmpty={false}
          successMessage={
            latestMutationResult?.ok
              ? "Note request completed successfully."
              : undefined
          }
        />
      </section>

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

      {cropOverlay ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-overlay-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
            background: "rgba(15, 23, 42, 0.88)",
          }}
        >
          <div className="panel" style={{ maxWidth: "min(96vw, 72rem)" }}>
            <div className="section-header" style={{ gap: "var(--space-3)" }}>
              <div>
                <h3 id="crop-overlay-title">Capture area screenshot</h3>
                <p className="muted" role="status">
                  Drag over the preview to select the area to upload. Press Escape or Cancel to stop.
                </p>
              </div>
              <div className="row compact-row">
                <button type="button" onClick={() => cancelCropOverlay()}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => void confirmCropOverlay()}
                  disabled={!getNormalizedSelection(cropOverlay.selection)}
                >
                  Confirm crop
                </button>
              </div>
            </div>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
                lineHeight: 0,
                cursor: "crosshair",
              }}
            >
              <img
                ref={cropImageRef}
                src={cropOverlay.imageSrc}
                alt="Captured screen preview for area selection"
                draggable={false}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                style={{
                  display: "block",
                  maxWidth: "min(92vw, 70rem)",
                  maxHeight: "70vh",
                  width: "auto",
                  height: "auto",
                  userSelect: "none",
                  borderRadius: "var(--radius-md)",
                }}
              />
              {getNormalizedSelection(cropOverlay.selection) ? (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${(getNormalizedSelection(cropOverlay.selection)!.left / cropOverlay.width) * 100}%`,
                    top: `${(getNormalizedSelection(cropOverlay.selection)!.top / cropOverlay.height) * 100}%`,
                    width: `${(getNormalizedSelection(cropOverlay.selection)!.width / cropOverlay.width) * 100}%`,
                    height: `${(getNormalizedSelection(cropOverlay.selection)!.height / cropOverlay.height) * 100}%`,
                    border: "2px solid #38bdf8",
                    background: "rgba(56, 189, 248, 0.2)",
                    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
