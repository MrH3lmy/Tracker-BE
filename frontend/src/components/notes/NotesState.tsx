import { Button, EmptyState } from "../ui";
import { Filter, StickyNote } from "../ui/icons";

interface NotesStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  hasActiveFilters: boolean;
  errorMessage?: string;
  onClearFilters: () => void;
  onNewNote: () => void;
}

export function NotesState({
  isLoading,
  isError,
  isEmpty,
  hasActiveFilters,
  errorMessage,
  onClearFilters,
  onNewNote,
}: NotesStateProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-fg-muted" role="status" aria-live="polite">
        Loading notes...
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-sm font-medium text-critical" role="status" aria-live="assertive">
        Failed to load notes. {errorMessage ?? "Request failed."}
      </p>
    );
  }

  if (!isEmpty) return null;

  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={Filter}
        title="No matching notes."
        description="Try a different search or clear your filters."
        action={<Button size="sm" onClick={onClearFilters}>Clear filters</Button>}
      />
    );
  }

  return (
    <EmptyState
      icon={StickyNote}
      title="No notes yet."
      description="Capture your first note to start building your library."
      action={<Button variant="primary" size="sm" onClick={onNewNote}>New note</Button>}
    />
  );
}
