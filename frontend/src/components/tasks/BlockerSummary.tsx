import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown } from '../ui/icons';
import { cn } from '../ui';
import type { TaskBlockerRef } from './taskTypes';

export interface BlockerSummaryProps {
  taskTitle: string;
  blockers: TaskBlockerRef[];
  className?: string;
}

/**
 * "Why can't I work on this, and what unblocks it" - answered *in the list*, without navigating.
 *
 * The first blocker is always visible as a link; the rest sit behind an operable `+n more` button,
 * which is the UI UX Pro Max `ux` "Chip Collection Reflow" (High) recommendation for overflow
 * ("wrap the collection or use an operable +n disclosure") rather than clipping the row or hiding
 * the remainder behind hover.
 */
export function BlockerSummary({ taskTitle, blockers, className }: BlockerSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (blockers.length === 0) return null;

  const [first, ...rest] = blockers;
  const visible = expanded ? blockers : [first];

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-caution">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Blocked by
        </span>
        <ul id={listId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {visible.map((blocker) => (
            <li key={blocker.id} className="min-w-0">
              <Link
                to={`/tasks/${blocker.id}`}
                className="inline-flex max-w-[18rem] items-center gap-1 rounded-sm text-fg-muted underline decoration-dotted underline-offset-2 transition-colors duration-(--duration-fast) hover:text-fg"
              >
                <span className="shrink-0 font-mono">#{blocker.id}</span>
                <span className="truncate">{blocker.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={listId}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line px-1.5 py-0.5 font-medium text-fg-muted transition-colors duration-(--duration-fast) hover:bg-inset hover:text-fg"
          >
            <span aria-hidden>{expanded ? 'Show fewer' : `+${rest.length} more`}</span>
            <span className="sr-only">
              {expanded ? `Show fewer blockers for ${taskTitle}` : `Show ${rest.length} more blockers for ${taskTitle}`}
            </span>
            <ChevronDown className={cn('h-3 w-3 transition-transform duration-(--duration-fast)', expanded && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
