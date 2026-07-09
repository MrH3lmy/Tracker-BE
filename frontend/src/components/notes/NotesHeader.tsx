import { type RefObject } from "react";
import { Link } from "react-router-dom";

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
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Knowledge base</p>
          <h2>Notes</h2>
          <p>
            Capture searchable notes, commands, JSON snippets, screenshots, and
            reference material.
          </p>
        </div>
        <div className="row compact-row">
          <button
            type="button"
            className="secondary-action"
            onClick={onReload}
            disabled={isReloading}
          >
            Reload
          </button>
          <button
            type="button"
            className="button-primary"
            ref={newNoteButtonRef}
            onClick={onNewNote}
            disabled={isBusy}
          >
            New note
          </button>
        </div>
      </header>

      {hasContextualActions ? (
        <div className="row compact-row" aria-label="Notes contextual actions">
          {canCaptureAreaNote ? (
            <button
              type="button"
              className="secondary-action"
              onClick={onCaptureAreaNote}
              disabled={isBusy || isUploadPending || isCapturePending}
            >
              {isCreatingScreenshotNote
                ? "Creating screenshot note..."
                : "Capture area note"}
            </button>
          ) : null}
          {isLinkedTaskView ? (
            <Link className="secondary-action" to="/notes">
              View all notes
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
