import { Badge } from '../ui';
import { AlertTriangle, CheckCircle2 } from '../ui/icons';

export interface ReadinessBadgeProps {
  blocked?: boolean;
  ready?: boolean;
  /**
   * Show an explicit "Ready" chip when the task isn't blocked. Off by default: in most lists
   * "not blocked" is the common case and doesn't need a badge (see design-system/tracker-be
   * MASTER.md rule 3). Turn it on for triage contexts where ready/blocked are compared side by
   * side (Task Detail, Project Tasks).
   */
  showReady?: boolean;
  className?: string;
}

/**
 * Dependency-derived readiness, not the manual workflow `Status` (see taskStyleUtils'
 * taskStatusVariant for that). Deliberately a different badge family (caution/positive with an
 * icon) so the two axes never look like the same thing.
 */
export function ReadinessBadge({ blocked, ready, showReady = false, className }: ReadinessBadgeProps) {
  if (blocked) {
    return (
      <Badge variant="caution" className={className}>
        <AlertTriangle className="h-3 w-3" aria-hidden />
        Blocked
      </Badge>
    );
  }
  if (showReady && ready) {
    return (
      <Badge variant="positive" className={className}>
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Ready
      </Badge>
    );
  }
  return null;
}
