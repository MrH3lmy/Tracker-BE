import { type RefObject } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader } from "../ui";
import { Camera, Plus, RefreshCw } from "../ui/icons";

interface NotesHeaderProps {
  canCaptureAreaNote: boolean;
  isBusy: boolean;
  isUploadPending: boolean;
  isCapturePending: boolean;
  isCreatingScreenshotNote: boolean;
  isLinkedTaskView: boolean;
  isReloading: boolean;
  onCaptureAreaNote: () => void;
  onNewNote: () => void;
  onReload: () => void;
  newNoteButtonRef: RefObject<HTMLButtonElement | null>;
}

export function NotesHeader({
  canCaptureAreaNote,
  isBusy,
  isUploadPending,
  isCapturePending,
  isCreatingScreenshotNote,
  isLinkedTaskView,
  isReloading,
  onCaptureAreaNote,
  onNewNote,
  onReload,
  newNoteButtonRef,
}: NotesHeaderProps) {
  const hasContextualActions = canCaptureAreaNote || isLinkedTaskView;

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Notes"
        description="Capture searchable notes, commands, JSON snippets, screenshots, and reference material."
        actions={
          <>
            <Button onClick={onReload} disabled={isReloading}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reload
            </Button>
            <Button variant="primary" ref={newNoteButtonRef} onClick={onNewNote} disabled={isBusy}>
              <Plus className="h-4 w-4" aria-hidden />
              New note
            </Button>
          </>
        }
        className="mb-0"
      />

      {hasContextualActions ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Notes contextual actions">
          {canCaptureAreaNote ? (
            <Button onClick={onCaptureAreaNote} disabled={isBusy || isUploadPending || isCapturePending}>
              <Camera className="h-4 w-4" aria-hidden />
              {isCreatingScreenshotNote ? "Creating screenshot note..." : "Capture area note"}
            </Button>
          ) : null}
          {isLinkedTaskView ? (
            <Link className="text-sm font-medium text-brand hover:underline" to="/notes">
              View all notes
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
