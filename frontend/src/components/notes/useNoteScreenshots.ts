import { useEffect, useRef, useState, type ClipboardEvent, type Dispatch, type FormEvent, type PointerEvent, type SetStateAction } from "react";
import type { useNoteMutations } from "../../hooks/useApiQueries";
import { buildNotePayload, type CropOverlayState, type CropPoint, type CropSelection, type NoteFormState } from "./notesPageHelpers";
import type { NoteAttachmentRecord, NoteRecord } from "./noteTypes";

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
const AREA_SCREENSHOT_SHORTCUT = "Ctrl+Alt+S (or Ctrl+Shift+S)";

interface PendingClipboardImage {
  placeholder: string;
  caption: string;
  fileName: string;
}

function extractCreatedNoteId(data: unknown): number | null {
  if (data && typeof data === "object" && "id" in data) {
    const id = Number((data as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function getClipboardImageFile(clipboardData: DataTransfer): File | null {
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
}

function insertReferenceIntoBody(
  body: string,
  reference: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
) {
  const start = Math.max(0, Math.min(selectionStart ?? body.length, body.length));
  const end = Math.max(start, Math.min(selectionEnd ?? start, body.length));
  const prefix = body.slice(0, start);
  const suffix = body.slice(end);
  const spacingBefore = prefix && !prefix.endsWith("\n") ? "\n" : "";
  const spacingAfter = suffix && !suffix.startsWith("\n") ? "\n" : "";

  return `${prefix}${spacingBefore}${reference}${spacingAfter}${suffix}`;
}

interface UseNoteScreenshotsParams {
  activeForm: NoteFormState;
  setForm: Dispatch<SetStateAction<NoteFormState>>;
  editingNoteId: number | null;
  setEditingNoteId: Dispatch<SetStateAction<number | null>>;
  isBusy: boolean;
  screenshotNoteTaskId: string;
  noteBodyRef: React.RefObject<HTMLTextAreaElement | null>;
  createNote: ReturnType<typeof useNoteMutations>["createNote"];
  updateNote: ReturnType<typeof useNoteMutations>["updateNote"];
  uploadScreenshot: ReturnType<typeof useNoteMutations>["uploadScreenshot"];
  refetchNotes: () => Promise<unknown>;
}

export function useNoteScreenshots({
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
  refetchNotes,
}: UseNoteScreenshotsParams) {
  const [attachmentCaptions, setAttachmentCaptions] = useState<Record<number, string>>({});
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
  const [pendingClipboardImages, setPendingClipboardImages] = useState<PendingClipboardImage[]>([]);
  const [capturingNoteId, setCapturingNoteId] = useState<number | null>(null);
  const [isCreatingScreenshotNote, setIsCreatingScreenshotNote] = useState(false);
  const [cropOverlay, setCropOverlay] = useState<CropOverlayState | null>(null);
  const screenshotFileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropOverlayRef = useRef<CropOverlayState | null>(null);
  const screenshotNoteHandlerRef = useRef<() => Promise<void>>(async () => undefined);

  const isUploadPending = uploadScreenshot.isPending;
  const isCapturePending = capturingNoteId !== null || isCreatingScreenshotNote;

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
          buildNotePayload(formWithPendingReference),
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
        body: buildNotePayload(updatedForm),
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
      if (createdNoteId !== null) await refetchNotes();
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

  const setScreenshotFileInput = (noteId: number, element: HTMLInputElement | null) => {
    screenshotFileInputs.current[noteId] = element;
  };

  const handleScreenshotSubmit = (
    event: FormEvent<HTMLFormElement>,
    note: NoteRecord,
  ) => {
    event.preventDefault();
    if (isUploadPending) return;

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
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
          formElement.reset();
          setScreenshotMessage(note.id, "success", "Image uploaded.");
          setAttachmentCaptions((current) => ({ ...current, [note.id]: "" }));
        },
      },
    );
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

  return {
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
  };
}
