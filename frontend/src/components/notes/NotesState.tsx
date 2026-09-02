import { Button, EmptyState } from "../ui";
import { AlertTriangle, Filter, Plus, StickyNote } from "../ui/icons";
import type { NoteSmartView } from "./notesSmartViews";

interface NotesStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  hasActiveFilters: boolean;
  /** True only when the user narrowed beyond the active smart view's own filters. */
  hasFiltersBeyondSmartView: boolean;
  errorMessage?: string;
  /** The built-in view in effect, so an empty result can teach how to fill *that* view. */
  smartView?: NoteSmartView;
  onClearFilters: () => void;
  onNewNote: () => void;
  onRetry: () => void;
  isRetrying: boolean;
}

/**
 * Skeleton rows that reserve the height a real result occupies, so the layout does not collapse
 * and then jump when notes arrive (UI UX Pro Max, `ux` Feedback -> "Loading Indicators: preserve
 * layout, focus and accessible busy status").
 */
function NotesLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading notes…</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4" aria-hidden>
          <div className="h-4 w-2/5 rounded-sm bg-inset" />
          <div className="h-3 w-1/4 rounded-sm bg-inset" />
          <div className="h-3 w-full rounded-sm bg-inset" />
          <div className="h-3 w-4/5 rounded-sm bg-inset" />
        </div>
      ))}
    </div>
  );
}

export function NotesState({
  isLoading,
  isError,
  isEmpty,
  hasActiveFilters,
  hasFiltersBeyondSmartView,
  errorMessage,
  smartView,
  onClearFilters,
  onNewNote,
  onRetry,
  isRetrying,
}: NotesStateProps) {
  if (isLoading) return <NotesLoadingSkeleton />;

  if (isError) {
    return (
      <div role="alert">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your notes"
          description={errorMessage ?? "The request failed before any notes came back."}
          action={
            <Button variant="primary" size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? "Retrying…" : "Try again"}
            </Button>
          }
        />
      </div>
    );
  }

  if (!isEmpty) return null;

  if (smartView && smartView.id !== "all" && !hasFiltersBeyondSmartView) {
    return (
      <EmptyState
        icon={smartView.icon}
        title={`Nothing in ${smartView.label} yet`}
        description={smartView.emptyHint}
        action={
          <Button size="sm" onClick={onClearFilters}>
            Back to all notes
          </Button>
        }
      />
    );
  }

  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={Filter}
        title="No notes match these filters"
        description={
          smartView
            ? `Nothing in "${smartView.label}" matches what you searched for. Widen the search, or clear the filters to see the whole library.`
            : "Try a shorter search term, a different note type, or clear the filters to see the whole library."
        }
        action={
          <Button size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={StickyNote}
      title="Your knowledge library is empty"
      description="Capture a meeting, a decision, or a snippet you keep re-deriving. Notes stay searchable, and their action items can become tasks."
      action={
        <Button variant="primary" size="sm" onClick={onNewNote}>
          <Plus className="h-4 w-4" aria-hidden />
          Capture your first note
        </Button>
      }
    />
  );
}
