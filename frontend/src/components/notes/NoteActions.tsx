import { useState, type FormEvent } from "react";
import type { NoteRecord } from "./noteTypes";
import { formatBytes, SCREENSHOT_MAX_FILE_SIZE_BYTES, SUPPORTED_SCREENSHOT_TYPES } from "./notesPageHelpers";
import { Button, Field, Input, Menu, MenuContent, MenuItem, MenuTrigger } from "../ui";
import { MoreHorizontal, X } from "../ui/icons";

interface ScreenshotMessage {
  kind: "success" | "error";
  text: string;
}

interface NoteActionsProps {
  note: NoteRecord;
  copied: boolean;
  onEdit: (note: NoteRecord) => void;
  onCopy: (note: NoteRecord) => void;
  onVersionHistory: (note: NoteRecord) => void;
  onTakeScreenshot?: (note: NoteRecord) => void;
  screenshotMode?: "inline" | "compact";
  screenshotMessage?: ScreenshotMessage;
  attachmentCaption?: string;
  onAttachmentCaptionChange?: (noteId: number, caption: string) => void;
  onScreenshotSubmit?: (event: FormEvent<HTMLFormElement>, note: NoteRecord) => void;
  screenshotInputRef?: (element: HTMLInputElement | null) => void;
  isUploadPending?: boolean;
  isCapturePending?: boolean;
  isCapturing?: boolean;
  displayMode?: "buttons" | "menu";
}

function ScreenshotFormFields({
  note,
  formId,
  helpId,
  messageId,
  attachmentCaption,
  onAttachmentCaptionChange,
  screenshotInputRef,
  isUploadPending,
  isCapturePending,
  isCapturing,
  onTakeScreenshot,
  screenshotMessage,
}: {
  note: NoteRecord;
  formId: string;
  helpId: string;
  messageId: string;
  attachmentCaption: string;
  onAttachmentCaptionChange?: (noteId: number, caption: string) => void;
  screenshotInputRef?: (element: HTMLInputElement | null) => void;
  isUploadPending: boolean;
  isCapturePending: boolean;
  isCapturing: boolean;
  onTakeScreenshot?: (note: NoteRecord) => void;
  screenshotMessage?: ScreenshotMessage;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-fg-muted" id={helpId}>
          Attach {SUPPORTED_SCREENSHOT_TYPES}. Limit: {formatBytes(SCREENSHOT_MAX_FILE_SIZE_BYTES)}.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" onClick={() => onTakeScreenshot?.(note)} disabled={isUploadPending || isCapturePending}>
            {isCapturing ? "Capturing..." : "Take area screenshot"}
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={isUploadPending || isCapturePending}>
            {isUploadPending ? "Uploading..." : "Attach image"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Image file" htmlFor={`${formId}-file`} className="min-w-48 flex-1">
          <Input
            id={`${formId}-file`}
            name="screenshot"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby={helpId}
            disabled={isUploadPending}
            ref={screenshotInputRef}
            className="h-auto py-1.5"
          />
        </Field>
        <Field label="Caption" htmlFor={`${formId}-caption`} className="min-w-48 flex-1">
          <Input
            id={`${formId}-caption`}
            value={attachmentCaption}
            placeholder={`Defaults to "${note.title}"`}
            onChange={(event) => onAttachmentCaptionChange?.(note.id, event.target.value)}
            disabled={isUploadPending}
          />
        </Field>
      </div>
      {screenshotMessage ? (
        <p
          id={messageId}
          className={screenshotMessage.kind === "error" ? "text-sm text-critical" : "text-sm text-fg-muted"}
          role={screenshotMessage.kind === "error" ? "alert" : "status"}
        >
          {screenshotMessage.text}
        </p>
      ) : null}
    </>
  );
}

export function NoteActions({
  note,
  copied,
  onEdit,
  onCopy,
  onVersionHistory,
  onTakeScreenshot,
  screenshotMode,
  screenshotMessage,
  attachmentCaption = "",
  onAttachmentCaptionChange,
  onScreenshotSubmit,
  screenshotInputRef,
  isUploadPending = false,
  isCapturePending = false,
  isCapturing = false,
  displayMode = "buttons",
}: NoteActionsProps) {
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const canAttachScreenshot = Boolean(onTakeScreenshot && onScreenshotSubmit);
  const formId = `note-actions-screenshot-${note.id}`;
  const helpId = `${formId}-help`;
  const messageId = `${formId}-message`;
  const showInlineScreenshotForm = canAttachScreenshot && screenshotMode === "inline";
  const showCompactScreenshotForm = canAttachScreenshot && screenshotMode === "compact" && isScreenshotOpen;

  const commonFieldsProps = {
    note,
    formId,
    helpId,
    messageId,
    attachmentCaption,
    onAttachmentCaptionChange,
    screenshotInputRef,
    isUploadPending,
    isCapturePending,
    isCapturing,
    onTakeScreenshot,
    screenshotMessage,
  };

  return (
    <div className="min-w-0">
      {displayMode === "menu" ? (
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" iconOnly aria-label={`Open actions for ${note.title}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </MenuTrigger>
          <MenuContent aria-label={`Actions for ${note.title}`}>
            <MenuItem onSelect={() => onEdit(note)}>Edit</MenuItem>
            <MenuItem onSelect={() => onCopy(note)}>{copied ? "Copied" : "Copy"}</MenuItem>
            <MenuItem onSelect={() => onVersionHistory(note)}>Version history</MenuItem>
            {canAttachScreenshot && screenshotMode === "compact" ? (
              <MenuItem onSelect={() => setIsScreenshotOpen(true)}>Attach screenshot</MenuItem>
            ) : null}
          </MenuContent>
        </Menu>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => onEdit(note)}>Edit</Button>
          <Button onClick={() => onCopy(note)}>{copied ? "Copied" : "Copy"}</Button>
          <Button onClick={() => onVersionHistory(note)}>Version history</Button>
          {canAttachScreenshot && screenshotMode === "compact" ? (
            <Button variant="ghost" onClick={() => setIsScreenshotOpen(true)}>Attach screenshot</Button>
          ) : null}
        </div>
      )}

      {showInlineScreenshotForm ? (
        <form
          className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-inset/30 p-3"
          onSubmit={(event) => onScreenshotSubmit?.(event, note)}
          aria-describedby={`${helpId}${screenshotMessage ? ` ${messageId}` : ""}`}
        >
          <ScreenshotFormFields {...commonFieldsProps} />
        </form>
      ) : null}

      {showCompactScreenshotForm ? (
        <div className="fixed inset-0 z-(--z-overlay) grid place-items-center bg-scrim p-4" role="presentation">
          <form
            className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-lg"
            onSubmit={(event) => onScreenshotSubmit?.(event, note)}
            aria-describedby={`${helpId}${screenshotMessage ? ` ${messageId}` : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Attach screenshot</p>
                <h4 className="text-base font-semibold text-fg">{note.title}</h4>
              </div>
              <Button type="button" variant="ghost" iconOnly aria-label="Close" onClick={() => setIsScreenshotOpen(false)}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <ScreenshotFormFields {...commonFieldsProps} />
          </form>
        </div>
      ) : null}
    </div>
  );
}
