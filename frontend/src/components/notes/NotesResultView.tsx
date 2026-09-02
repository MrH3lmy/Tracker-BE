import type { FormEvent, ReactNode } from "react";
import { NoteActions } from "./NoteActions";
import { NoteCard } from "./NoteCard";
import { NotesTable } from "./NotesTable";
import type { NoteBlockRecord, NoteRecord } from "./noteTypes";
import { formatDate, getStickyNoteNumber, type NotesViewMode } from "./notesPageHelpers";

interface ScreenshotMessage {
  kind: "success" | "error";
  text: string;
}

export interface NotesResultViewProps {
  viewMode: NotesViewMode;
  notes: NoteRecord[];
  projectTitleById: Map<number, string>;
  taskTitleById: Map<number, string>;
  copiedNoteId: number | null;
  sortBy: string;
  onEdit: (note: NoteRecord) => void;
  onCopy: (note: NoteRecord) => void;
  onVersionHistory: (note: NoteRecord) => void;
  onConvertBlock: (note: NoteRecord, block: NoteBlockRecord) => void;
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

function groupByDay(notes: NoteRecord[], sortBy: string): Array<[string, NoteRecord[]]> {
  const groups = notes.reduce<Record<string, NoteRecord[]>>((accumulator, note) => {
    const raw = sortBy === "createdAt" ? note.createdAt : note.updatedAt || note.createdAt;
    const key = raw && !Number.isNaN(new Date(raw).getTime()) ? new Date(raw).toLocaleDateString() : "No date";
    accumulator[key] = [...(accumulator[key] ?? []), note];
    return accumulator;
  }, {});
  return Object.entries(groups);
}

/**
 * Renders the loaded notes in the selected display mode (issue #299). All four modes from the
 * previous implementation are preserved - sticky board, list, table and timeline - they just live
 * in one component instead of four inline branches inside the page.
 */
export function NotesResultView(props: NotesResultViewProps) {
  const {
    viewMode,
    notes,
    projectTitleById,
    taskTitleById,
    copiedNoteId,
    sortBy,
    onEdit,
    onCopy,
    onVersionHistory,
    onConvertBlock,
    onTakeScreenshot,
    onScreenshotSubmit,
    screenshotMessages,
    attachmentCaptions,
    onAttachmentCaptionChange,
    screenshotInputRef,
    isUploadPending,
    isCapturePending,
    capturingNoteId,
  } = props;

  const linkedTaskTitle = (note: NoteRecord): string | undefined => {
    const taskId = note.taskId ?? note.taskLinks?.[0]?.taskId;
    if (!taskId) return undefined;
    return taskTitleById.get(taskId) ?? note.taskLinks?.[0]?.taskTitle ?? `Task #${taskId}`;
  };

  // Always "compact": the attach-screenshot form lives behind the row's actions menu instead of
  // rendering a permanent file input inside every result (issue #299 - progressive disclosure).
  const renderActions = (note: NoteRecord): ReactNode => (
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
  );

  const card = (note: NoteRecord, layout: "tile" | "row", extras?: { eyebrow?: ReactNode; subtitle?: ReactNode }) => (
    <NoteCard
      key={note.id}
      note={note}
      layout={layout}
      eyebrow={extras?.eyebrow}
      subtitle={extras?.subtitle}
      onConvertBlock={onConvertBlock}
      projectName={note.projectId ? projectTitleById.get(note.projectId) : undefined}
      linkedTaskTitle={linkedTaskTitle(note)}
      actions={renderActions(note)}
    />
  );

  return (
    <div data-notes-view-mode={viewMode}>
      {viewMode === "sticky" ? (
        // positionX/positionY/width/height/zIndex are still written on create/edit (kept for API
        // compatibility) but are not read for layout: a responsive masonry grid replaces the old
        // absolute-position canvas, which never had a drag interaction wired up.
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3" aria-label="Sticky note board">
          {notes.map((note) =>
            card(note, "tile", {
              eyebrow: (
                <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                  Sticky #{getStickyNoteNumber(note)}
                </p>
              ),
            }),
          )}
        </div>
      ) : null}

      {viewMode === "list" ? (
        <div className="flex flex-col gap-3" aria-label="Notes list">
          {notes.map((note) => card(note, "row"))}
        </div>
      ) : null}

      {viewMode === "table" ? (
        <NotesTable
          notes={notes}
          taskTitleById={taskTitleById}
          projectTitleById={projectTitleById}
          copiedNoteId={copiedNoteId}
          onEdit={onEdit}
          onCopy={onCopy}
          onVersionHistory={onVersionHistory}
          onTakeScreenshot={onTakeScreenshot}
          onScreenshotSubmit={onScreenshotSubmit}
          screenshotMessages={screenshotMessages}
          attachmentCaptions={attachmentCaptions}
          onAttachmentCaptionChange={onAttachmentCaptionChange}
          screenshotInputRef={screenshotInputRef}
          isUploadPending={isUploadPending}
          isCapturePending={isCapturePending}
          capturingNoteId={capturingNoteId}
        />
      ) : null}

      {viewMode === "timeline" ? (
        <div className="flex flex-col gap-5" aria-label="Notes timeline">
          {groupByDay(notes, sortBy).map(([date, dateNotes]) => (
            <section key={date} aria-label={`Notes from ${date}`} className="flex flex-col gap-2">
              <h4 className="sticky top-0 z-1 bg-canvas py-1 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                {date}
              </h4>
              <div className="flex flex-col gap-3 border-l-2 border-line pl-4">
                {dateNotes.map((note) =>
                  card(note, "row", {
                    subtitle: (
                      <p className="text-xs text-fg-subtle">Created {formatDate(note.createdAt)}</p>
                    ),
                  }),
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
