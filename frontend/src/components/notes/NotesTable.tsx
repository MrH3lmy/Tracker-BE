import type { FormEvent } from "react";
import { NoteActions } from "./NoteActions";
import styles from "./NotesPage.module.css";
import type { NoteRecord } from "./noteTypes";
import { formatDate, humanizeContentType } from "./notesPageHelpers";

interface ScreenshotMessage {
  kind: "success" | "error";
  text: string;
}

interface NotesTableProps {
  notes: NoteRecord[];
  taskTitleById: Map<number, string>;
  copiedNoteId: number | null;
  onEdit: (note: NoteRecord) => void;
  onCopy: (note: NoteRecord) => void;
  onVersionHistory: (note: NoteRecord) => void;
  onTakeScreenshot: (note: NoteRecord) => void;
  onScreenshotSubmit: (event: FormEvent<HTMLFormElement>, note: NoteRecord) => void;
  screenshotMessages: Record<number, ScreenshotMessage | undefined>;
  attachmentCaptions: Record<number, string | undefined>;
  onAttachmentCaptionChange: (noteId: number, caption: string) => void;
  screenshotInputRef: (noteId: number, element: HTMLInputElement | null) => void;
  isUploadPending: boolean;
  isCapturePending: boolean;
  capturingNoteId: number | null;
}

function linkedTaskLabel(note: NoteRecord, taskTitleById: Map<number, string>) {
  if (note.taskId) return taskTitleById.get(note.taskId) ?? `#${note.taskId}`;
  const firstTaskLink = note.taskLinks?.[0];
  return firstTaskLink ? taskTitleById.get(firstTaskLink.taskId) ?? `#${firstTaskLink.taskId}` : "—";
}

export function NotesTable({
  notes,
  taskTitleById,
  copiedNoteId,
  onEdit,
  onCopy,
  onVersionHistory,
  onTakeScreenshot,
  onScreenshotSubmit,
  screenshotMessages,
  attachmentCaptions,
  onAttachmentCaptionChange,
  screenshotInputRef,
  isUploadPending,
  isCapturePending,
  capturingNoteId,
}: NotesTableProps) {
  return (
    <div className={`table-scroll ${styles.tableWrapper}`}>
      <table className={`data-table ${styles.fullWidthTable} ${styles.notesTable}`}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Linked task</th>
            <th>Type</th>
            <th>Collection</th>
            <th>Updated</th>
            <th className={styles.notesTableActionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note.id}>
              <td className={styles.notesTableTitleCell} title={note.title}>{note.title}</td>
              <td>{linkedTaskLabel(note, taskTitleById)}</td>
              <td><span className={styles.notesTableBadge}>{humanizeContentType(note.contentType)}</span></td>
              <td><span className={styles.notesTableBadge}>{note.collectionName ?? "No collection"}</span></td>
              <td className={styles.notesTableUpdatedCell}>{formatDate(note.updatedAt)}</td>
              <td className={styles.notesTableActionsCell}>
                <NoteActions
                  note={note}
                  copied={copiedNoteId === note.id}
                  onEdit={onEdit}
                  onCopy={onCopy}
                  onVersionHistory={onVersionHistory}
                  screenshotMode="compact"
                  onTakeScreenshot={onTakeScreenshot}
                  onScreenshotSubmit={onScreenshotSubmit}
                  screenshotMessage={screenshotMessages[note.id]}
                  attachmentCaption={attachmentCaptions[note.id] ?? ""}
                  onAttachmentCaptionChange={onAttachmentCaptionChange}
                  screenshotInputRef={(element) => screenshotInputRef(note.id, element)}
                  isUploadPending={isUploadPending}
                  isCapturePending={isCapturePending}
                  isCapturing={capturingNoteId === note.id}
                  displayMode="menu"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
