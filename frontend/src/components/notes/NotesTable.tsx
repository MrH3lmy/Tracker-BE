import type { FormEvent } from "react";
import { NoteActions } from "./NoteActions";
import type { NoteRecord } from "./noteTypes";
import { formatDate, humanizeContentType } from "./notesPageHelpers";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../ui";

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
    <Table aria-label="Notes table">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell>Linked task</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Collection</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
            <TableCell className="max-w-[22rem] truncate font-medium" title={note.title}>{note.title}</TableCell>
            <TableCell className="text-fg-muted">{linkedTaskLabel(note, taskTitleById)}</TableCell>
            <TableCell><Badge variant="neutral">{humanizeContentType(note.contentType)}</Badge></TableCell>
            <TableCell><Badge variant="neutral">{note.collectionName ?? "No collection"}</Badge></TableCell>
            <TableCell className="whitespace-nowrap text-fg-muted">{formatDate(note.updatedAt)}</TableCell>
            <TableCell className="text-right">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
