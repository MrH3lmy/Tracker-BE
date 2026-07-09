import styles from "./NotesPage.module.css";

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
      <div className={styles.notesState} role="status" aria-live="polite">
        <p className={styles.notesStateTitle}>Loading notes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.notesState} role="status" aria-live="assertive">
        <p className={styles.notesStateTitle}>Failed to load notes.</p>
        <p className="error">{errorMessage ?? "Request failed."}</p>
      </div>
    );
  }

  if (!isEmpty) return null;

  if (hasActiveFilters) {
    return (
      <div className={styles.notesState} role="status" aria-live="polite">
        <p className={styles.notesStateTitle}>No matching notes.</p>
        <p className="muted">Try a different search or clear your filters.</p>
        <button type="button" className="button-secondary" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className={styles.notesState} role="status" aria-live="polite">
      <p className={styles.notesStateTitle}>No notes yet.</p>
      <p className="muted">Capture your first note to start building your library.</p>
      <button type="button" className="button-primary" onClick={onNewNote}>
        New note
      </button>
    </div>
  );
}
