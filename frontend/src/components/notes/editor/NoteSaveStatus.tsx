import type { SaveStatus } from './useNoteAutosave';
import { Button, cn } from '../../ui';
import { AlertTriangle, Check, Loader2 } from '../../ui/icons';

interface NoteSaveStatusProps {
  status: SaveStatus;
  errorMessage?: string;
  onRetry: () => void;
}

/**
 * The one honest signal that the document is safe (issue #299 follow-up).
 *
 * It never claims "Saved" before the server confirmed it, and a failure is a persistent, styled
 * error with a retry rather than a toast that disappears. The container reserves a fixed width so
 * the header does not reflow as the label changes (UI UX Pro Max, `ux` Layout -> "Content
 * Jumping": keep async states in a stable container).
 */
export function NoteSaveStatus({ status, errorMessage, onRetry }: NoteSaveStatusProps) {
  if (status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-2" role="alert">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-critical">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Not saved
        </span>
        <span className="text-xs text-fg-muted">{errorMessage}</span>
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const label =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'dirty' ? 'Unsaved changes' : '';

  return (
    <p
      className={cn(
        'inline-flex min-w-28 items-center justify-end gap-1.5 text-sm',
        status === 'saved' ? 'text-positive' : 'text-fg-muted',
      )}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
      {status === 'saved' ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {label}
    </p>
  );
}
