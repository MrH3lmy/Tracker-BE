import { useState, type FormEvent } from "react";
import styles from "./NotesPage.module.css";
import type { NoteRecord } from "./noteTypes";
import { formatBytes, SCREENSHOT_MAX_FILE_SIZE_BYTES, SUPPORTED_SCREENSHOT_TYPES } from "./notesPageHelpers";

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
  const showScreenshotForm = canAttachScreenshot && (screenshotMode === "inline" || isScreenshotOpen);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openScreenshotForm = () => {
    setIsScreenshotOpen(true);
    setIsMenuOpen(false);
  };
  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };
  const actionButtons = (
    <>
      <button type="button" onClick={() => handleMenuAction(() => onEdit(note))}>Edit</button>
      <button type="button" onClick={() => handleMenuAction(() => onCopy(note))}>{copied ? "Copied" : "Copy"}</button>
      <button type="button" onClick={() => handleMenuAction(() => onVersionHistory(note))}>Version history</button>
      {canAttachScreenshot && screenshotMode === "compact" ? (
        <button type="button" className="secondary-action" onClick={openScreenshotForm}>Attach screenshot</button>
      ) : null}
    </>
  );

  return (
    <div className={styles.noteActionsShell}>
      {displayMode === "menu" ? (
        <div className={styles.noteActionsMenu}>
          <button
            type="button"
            className={styles.noteActionsMenuTrigger}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Open actions for ${note.title}`}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            ⋯
          </button>
          {isMenuOpen ? <div className={styles.noteActionsMenuPanel} role="menu">{actionButtons}</div> : null}
        </div>
      ) : (
        <div className={`row compact-row ${styles.noteActions}`}>{actionButtons}</div>
      )}

      {showScreenshotForm ? (
        <div className={screenshotMode === "compact" ? styles.compactScreenshotBackdrop : undefined} role={screenshotMode === "compact" ? "presentation" : undefined}>
          <form
            className={`panel ${styles.screenshotForm} ${screenshotMode === "compact" ? styles.compactScreenshotDialog : ""}`}
            onSubmit={(event) => onScreenshotSubmit?.(event, note)}
            aria-describedby={`${helpId}${screenshotMessage ? ` ${messageId}` : ""}`}
          >
            {screenshotMode === "compact" ? (
              <div className="section-header">
                <div>
                  <p className="eyebrow">Attach screenshot</p>
                  <h4>{note.title}</h4>
                </div>
                <button type="button" onClick={() => setIsScreenshotOpen(false)}>Close</button>
              </div>
            ) : null}
            <div className={`section-header ${styles.screenshotHeader}`}>
              <p className="muted" id={helpId}>Attach {SUPPORTED_SCREENSHOT_TYPES}. Limit: {formatBytes(SCREENSHOT_MAX_FILE_SIZE_BYTES)}.</p>
              <div className="row compact-row">
                <button type="button" className="secondary-action" onClick={() => onTakeScreenshot?.(note)} disabled={isUploadPending || isCapturePending}>{isCapturing ? "Capturing..." : "Take area screenshot"}</button>
                <button type="submit" className="secondary-action" disabled={isUploadPending || isCapturePending}>{isUploadPending ? "Uploading..." : "Attach image"}</button>
              </div>
            </div>
            <div className={`row ${styles.endWrapRow}`}>
              <label className={`field-stack ${styles.screenshotField}`} htmlFor={`${formId}-file`}><span>Image file</span><input id={`${formId}-file`} name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={helpId} disabled={isUploadPending} ref={screenshotInputRef} /></label>
              <label className={`field-stack ${styles.screenshotField}`} htmlFor={`${formId}-caption`}><span>Caption</span><input id={`${formId}-caption`} value={attachmentCaption} placeholder={`Defaults to “${note.title}”`} onChange={(event) => onAttachmentCaptionChange?.(note.id, event.target.value)} disabled={isUploadPending} /></label>
            </div>
            {screenshotMessage ? <p id={messageId} className={screenshotMessage.kind === "error" ? "error-text" : "muted"} role={screenshotMessage.kind === "error" ? "alert" : "status"}>{screenshotMessage.text}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
