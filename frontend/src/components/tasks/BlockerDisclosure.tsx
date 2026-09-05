import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { Link } from 'react-router-dom';
import { Badge, Collapsible, cn } from '../ui';
import { AlertTriangle, ArrowRight, ChevronDown } from '../ui/icons';
import { formatEnumLabel } from '../../lib/enumLabels';
import { taskStatusVariant } from './taskStyleUtils';
import type { TaskBlockerRef } from './taskTypes';

export interface BlockerDisclosureProps {
  blockers?: TaskBlockerRef[];
  defaultOpen?: boolean;
  className?: string;
  /**
   * `panel` (default) is the bordered disclosure used on record surfaces -- Task
   * Detail, Today, Project tasks -- and is unchanged.
   *
   * `inline` is the compact form the board card uses. A bordered panel inside a
   * bordered card inside a lane is the "card-in-card-in-card" anti-pattern
   * (tracker-v2 MASTER.md section 13.2), so on the board the disclosure is a
   * plain text trigger with no surface of its own.
   */
  variant?: 'panel' | 'inline';
}

/**
 * "Why is this blocked, and what unblocks it" - a blocked chip never appears without this one
 * interaction away (design-system/tracker-v2/pages/tasks-surfaces.md section 5). Each blocker links
 * to its own task detail where practical.
 */
export function BlockerDisclosure({ blockers, defaultOpen = false, className, variant = 'panel' }: BlockerDisclosureProps) {
  if (!blockers || blockers.length === 0) return null;

  const summary = `Waiting for ${blockers.length} ${blockers.length === 1 ? 'task' : 'tasks'}`;

  if (variant === 'inline') {
    return (
      <RadixCollapsible.Root defaultOpen={defaultOpen} className={cn('min-w-0', className)}>
        <RadixCollapsible.Trigger className="group flex min-h-6 w-full cursor-pointer items-center gap-1 rounded-xs text-left text-[11px] font-medium text-caution transition-colors duration-(--duration-fast) hover:text-fg">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronDown
            className="h-3 w-3 shrink-0 transition-transform duration-(--duration-fast) group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </RadixCollapsible.Trigger>
        <RadixCollapsible.Content>
          <ul className="mt-1 flex flex-col border-l border-line pl-2">
            {blockers.map((blocker) => (
              <li key={blocker.id}>
                <Link
                  to={`/tasks/${blocker.id}`}
                  className="flex min-h-7 items-center gap-1 rounded-xs text-[11px] text-fg-muted transition-colors duration-(--duration-fast) hover:text-brand"
                >
                  <ArrowRight className="h-3 w-3 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="min-w-0 truncate">{blocker.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </RadixCollapsible.Content>
      </RadixCollapsible.Root>
    );
  }

  return (
    <Collapsible
      className={className}
      defaultOpen={defaultOpen}
      title={
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg-muted">
          <AlertTriangle className="h-3.5 w-3.5 text-caution" aria-hidden />
          {summary}
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
