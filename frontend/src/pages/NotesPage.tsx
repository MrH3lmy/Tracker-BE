import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QueryState } from "../components/QueryState";
import { CodePreview } from "../components/notes/CodePreview";
import type {
  NoteContentType,
  NoteRecord,
} from "../components/notes/noteTypes";
import type { TaskRecord } from "../components/tasks/taskTypes";
import {
  latestResult,
  useNoteMutations,
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
  tags: string;
  body: string;
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
  return {
    title: form.title.trim(),
    contentType: form.contentType,
    taskId: trimmedTaskId ? Number(trimmedTaskId) : null,
    tags: parseTags(form.tags),
    body: form.body,
  };
}

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const linkedTaskId = searchParams.get("taskId")?.trim() ?? "";
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<
    NoteContentType | "all"
  >("all");
  const [tagFilter, setTagFilter] = useState("");
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
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

  const notesQuery = useNotesQuery({
    q: search,
    contentType: contentTypeFilter,
    taskId: linkedTaskId,
    tags: tagFilter,
  });
  const tasksQuery = useTasksQuery("active");
  const { createNote, updateNote, deleteNote, uploadScreenshot } =
    useNoteMutations();
  const latestMutationResult = latestResult(
    createNote.data,
    updateNote.data,
    deleteNote.data,
    uploadScreenshot.data,
  );
  const availableTasks = useMemo<TaskRecord[]>(
    () => (Array.isArray(tasksQuery.data?.data) ? tasksQuery.data.data : []),
    [tasksQuery.data],
  );
  const notes = useMemo(() => {
    const records = notesQuery.data?.data ?? [];
    if (!linkedTaskId) return records;

    return [...records].sort((first, second) => {
      const orderDelta =
        getStickyNoteNumber(first) - getStickyNoteNumber(second);
      return orderDelta === 0 ? first.id - second.id : orderDelta;
    });
  }, [linkedTaskId, notesQuery.data]);
  const isBusy =
    createNote.isPending || updateNote.isPending || deleteNote.isPending;
  const isUploadPending = uploadScreenshot.isPending;
  const isCapturePending = capturingNoteId !== null || isCreatingScreenshotNote;
  const screenshotNoteTaskId =
    linkedTaskId || (editingNoteId === null ? form.taskId.trim() : "");
  const activeForm =
    editingNoteId === null && linkedTaskId && form.taskId.trim() === ""
      ? { ...form, taskId: linkedTaskId }
      : form;
  const canSubmit =
    activeForm.title.trim().length > 0 &&
    activeForm.body.trim().length > 0 &&
    !isBusy;

  const resetForm = () => {
    setForm(emptyFormForTask(linkedTaskId));
    setEditingNoteId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = buildPayload(activeForm);
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

  const extractDownloadUrl = (data: unknown): string | null => {
    if (!data || typeof data !== "object") return null;

    if ("downloadUrl" in data) {
      const downloadUrl = (data as { downloadUrl?: unknown }).downloadUrl;
      return typeof downloadUrl === "string" && downloadUrl.trim()
        ? downloadUrl
        : null;
    }

    if ("attachment" in data) {
      return extractDownloadUrl((data as { attachment?: unknown }).attachment);
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

  const buildClipboardReference = (caption: string, downloadUrl: string | null) => {
    if (activeForm.contentType === "MARKDOWN" && downloadUrl) {
      return `![${caption}](${downloadUrl})`;
    }

    return downloadUrl
      ? `[Screenshot: ${caption}] ${downloadUrl}`
      : `[Screenshot: ${caption}]`;
  };

  const insertBodyReference = (
    reference: string,
    selectionStart?: number | null,
    selectionEnd?: number | null,
  ) => {
    setForm((current) => {
      const body = current.body;
      const start = Math.max(0, Math.min(selectionStart ?? body.length, body.length));
      const end = Math.max(start, Math.min(selectionEnd ?? start, body.length));
      const prefix = body.slice(0, start);
      const suffix = body.slice(end);
      const spacingBefore = prefix && !prefix.endsWith("\n") ? "\n" : "";
      const spacingAfter = suffix && !suffix.startsWith("\n") ? "\n" : "";
      const cursorPosition = prefix.length + spacingBefore.length + reference.length;

      window.setTimeout(() => {
        noteBodyRef.current?.focus();
        noteBodyRef.current?.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);

      return {
        ...current,
        body: `${prefix}${spacingBefore}${reference}${spacingAfter}${suffix}`,
      };
    });
  };

  const handleBodyPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImage = getClipboardImageFile(event.clipboardData);
    if (!pastedImage) return;

    event.preventDefault();
    if (isBusy || isUploadPending) return;

    const caption = `Pasted screenshot - ${new Date().toLocaleString()}`;
    const selectionStart = event.currentTarget.selectionStart;
    const selectionEnd = event.currentTarget.selectionEnd;
    let noteId = editingNoteId;

    setClipboardImageMessage({
      kind: "success",
      text: "Uploading pasted image...",
    });

    try {
      if (noteId === null) {
        if (!activeForm.title.trim()) {
          setClipboardImageMessage({
            kind: "error",
            text: "Enter a note title before pasting an image into a new note.",
          });
          return;
        }

        const createResult = await createNote.mutateAsync({
          ...buildPayload(activeForm),
          body: activeForm.body || caption,
        });
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

      insertBodyReference(
        buildClipboardReference(caption, extractDownloadUrl(uploadResult.data)),
        selectionStart,
        selectionEnd,
      );
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

        <div className="stacked-list" aria-label="Notes list">
          {notes.map((note) => (
            <article
              key={note.id}
              className="panel"
              style={{ padding: "var(--space-5)", marginTop: "var(--space-4)" }}
            >
              <div className="section-header">
                <div>
                  <p className="eyebrow">
                    Sticky note #{getStickyNoteNumber(note)} ·{" "}
                    {humanizeContentType(note.contentType)}
                  </p>
                  <h3>{note.title}</h3>
                  <p className="muted">
                    Task {note.taskId ?? "none"} · Updated{" "}
                    {formatDate(note.updatedAt)}
                  </p>
                  {note.tags && note.tags.length > 0 ? (
                    <div
                      className="row compact-row"
                      aria-label={`Tags for ${note.title}`}
                      style={{ marginTop: "var(--space-2)" }}
                    >
                      {note.tags.map((tag) => (
                        <span key={tag} className="status-badge status-other">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="row compact-row">
                  <button type="button" onClick={() => copyBody(note)}>
                    {copiedNoteId === note.id ? "Copied" : "Copy body"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(note.id);
                      setForm(noteToForm(note));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote.mutate(note.id)}
                    disabled={isBusy}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <CodePreview body={note.body} contentType={note.contentType} />
              <form
                className="panel"
                onSubmit={(event) => handleScreenshotSubmit(event, note)}
                style={{
                  margin: "var(--space-4) 0 0",
                  padding: "var(--space-3)",
                }}
              >
                <div
                  className="section-header"
                  style={{ alignItems: "end", gap: "var(--space-3)" }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>Attach image</h4>
                    <p className="muted" id={`screenshot-help-${note.id}`}>
                      Supports {SUPPORTED_SCREENSHOT_TYPES}. Use “Take area screenshot” to capture and crop part of a screen, window, or tab. Backend limit from{" "}
                      <code>app.notes.screenshots.max-file-size-bytes</code>:{" "}
                      {formatBytes(SCREENSHOT_MAX_FILE_SIZE_BYTES)}.
                    </p>
                  </div>
                  <div className="row compact-row">
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => void handleTakeScreenshot(note)}
                      disabled={isUploadPending || isCapturePending}
                    >
                      {capturingNoteId === note.id
                        ? "Capturing..."
                        : "Take area screenshot"}
                    </button>
                    <button
                      type="submit"
                      className="secondary-action"
                      disabled={isUploadPending || isCapturePending}
                    >
                      {isUploadPending ? "Uploading..." : "Attach image"}
                    </button>
                  </div>
                </div>
                <div
                  className="row"
                  style={{ alignItems: "end", flexWrap: "wrap" }}
                >
                  <label
                    className="field-stack"
                    htmlFor={`screenshot-file-${note.id}`}
                    style={{ flex: "1 1 18rem" }}
                  >
                    <span>Image file</span>
                    <input
                      id={`screenshot-file-${note.id}`}
                      name="screenshot"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-describedby={`screenshot-help-${note.id}`}
                      disabled={isUploadPending}
                      ref={(element) => {
                        screenshotFileInputs.current[note.id] = element;
                      }}
                      required
                    />
                  </label>
                  <label
                    className="field-stack"
                    htmlFor={`screenshot-caption-${note.id}`}
                    style={{ flex: "1 1 18rem" }}
                  >
                    <span>Caption (optional)</span>
                    <input
                      id={`screenshot-caption-${note.id}`}
                      value={attachmentCaptions[note.id] ?? ""}
                      placeholder={`Defaults to “${note.title}”`}
                      onChange={(event) =>
                        setAttachmentCaptions((current) => ({
                          ...current,
                          [note.id]: event.target.value,
                        }))
                      }
                      disabled={isUploadPending}
                    />
                  </label>
                </div>
                {screenshotMessages[note.id] ? (
                  <p
                    className={
                      screenshotMessages[note.id].kind === "error"
                        ? "error-text"
                        : "muted"
                    }
                    role={
                      screenshotMessages[note.id].kind === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {screenshotMessages[note.id].text}
                  </p>
                ) : null}
              </form>
              {note.attachments
                ?.filter(
                  (attachment) =>
                    attachment.kind === "SCREENSHOT" && attachment.downloadUrl,
                )
                .map((attachment) => (
                  <figure
                    key={attachment.id}
                    className="panel"
                    style={{
                      margin: "var(--space-4) 0 0",
                      padding: "var(--space-3)",
                    }}
                  >
                    <img
                      src={attachment.downloadUrl!}
                      alt={attachment.caption ?? attachment.fileName}
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                    <figcaption
                      className="muted"
                      style={{ marginTop: "var(--space-2)" }}
                    >
                      {attachment.caption ?? attachment.fileName}
                      {" · "}
                      <a
                        href={attachment.downloadUrl!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open/download attachment
                      </a>
                    </figcaption>
                  </figure>
                ))}
            </article>
          ))}
        </div>
      </section>

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

          <label className="field-stack" htmlFor="noteBody">
            <span>Body</span>
            <textarea
              id="noteBody"
              className="text-block"
              rows={12}
              value={activeForm.body}
              ref={noteBodyRef}
              onPaste={(event) => void handleBodyPaste(event)}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              required
            />
          </label>
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
