import { Link } from 'react-router-dom';
import { Badge, Collapsible } from '../ui';
import { AlertTriangle, ArrowRight } from '../ui/icons';
import { formatEnumLabel } from '../../lib/enumLabels';
import { taskStatusVariant } from './taskStyleUtils';
import type { TaskBlockerRef } from './taskTypes';

export interface BlockerDisclosureProps {
  blockers?: TaskBlockerRef[];
  defaultOpen?: boolean;
  className?: string;
}

/**
 * "Why is this blocked, and what unblocks it" - a blocked chip never appears without this one
 * interaction away (design-system/tracker-be MASTER.md rule 2). Each blocker links to its own
 * task detail where practical.
 */
export function BlockerDisclosure({ blockers, defaultOpen = false, className }: BlockerDisclosureProps) {
  if (!blockers || blockers.length === 0) return null;

  return (
    <Collapsible
      className={className}
      defaultOpen={defaultOpen}
      title={
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg-muted">
          <AlertTriangle className="h-3.5 w-3.5 text-caution" aria-hidden />
          Waiting for {blockers.length} {blockers.length === 1 ? 'task' : 'tasks'}
        </span>
      }
    >
      <ul className="flex flex-col gap-1">
        {blockers.map((blocker) => (
          <li key={blocker.id}>
            <Link
              to={`/tasks/${blocker.id}`}
              className="flex min-h-11 items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-fg transition-colors duration-(--duration-fast) hover:bg-inset"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <span className="truncate">{blocker.title}</span>
              </span>
              {blocker.status && <Badge variant={taskStatusVariant(blocker.status)}>{formatEnumLabel(blocker.status)}</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}
