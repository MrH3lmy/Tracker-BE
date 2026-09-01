import { Link } from 'react-router-dom';
import { Collapsible } from '../ui';
import { ArrowRight, CheckCircle2, FolderKanban, Pencil, Plus, StickyNote } from '../ui/icons';
import { formatEnumLabel } from '../../lib/enumLabels';
import type { ActivityEventType, ProjectActivityRecord } from './projectTypes';

const EVENT_ICON: Record<ActivityEventType, typeof StickyNote> = {
  PROJECT_CREATED: FolderKanban,
  PROJECT_UPDATED: FolderKanban,
  TASK_CREATED: Plus,
  TASK_UPDATED: Pencil,
  TASK_COMPLETED: CheckCircle2,
  NOTE_CREATED: StickyNote,
  NOTE_UPDATED: StickyNote,
  NOTE_TASK_CREATED: ArrowRight,
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absoluteFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function formatRelativeTime(isoLocalDateTime: string): { label: string; title: string } {
  const date = new Date(isoLocalDateTime);
  if (Number.isNaN(date.getTime())) return { label: isoLocalDateTime, title: isoLocalDateTime };
  const title = absoluteFormatter.format(date);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) return { label: rtf.format(diffMinutes, 'minute'), title };
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return { label: rtf.format(diffHours, 'hour'), title };
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 6) return { label: rtf.format(diffDays, 'day'), title };
  return { label: title, title };
}

function humanizeMetadataKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EntityLink({ entry }: { entry: ProjectActivityRecord }) {
  if (entry.entityType === 'TASK' && entry.entityId) {
    return <Link to={`/tasks/${entry.entityId}`} className="text-sm font-medium text-brand hover:underline">Open task</Link>;
  }
  return null;
}

/**
 * One activity row (issue #296) - never renders raw JSON metadata; it goes behind a "Details"
 * disclosure as a plain key/value list (design-system/tracker-be/pages/activity.md).
 */
export function ActivityTimelineItem({ entry }: { entry: ProjectActivityRecord }) {
  const Icon = EVENT_ICON[entry.eventType] ?? FolderKanban;
  const { label, title } = formatRelativeTime(entry.occurredAt);
  const metadataEntries = entry.metadata ? Object.entries(entry.metadata).filter(([, value]) => value !== null && value !== undefined) : [];

  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-sm font-medium text-fg">{entry.summary}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <time dateTime={entry.occurredAt} title={title} className="text-xs text-fg-subtle">{label}</time>
          <EntityLink entry={entry} />
        </div>
        {metadataEntries.length > 0 && (
          <Collapsible className="mt-2" title={<span className="text-xs font-medium text-fg-muted">Details</span>}>
            <dl className="flex flex-col gap-1 text-sm">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-fg-muted">{humanizeMetadataKey(key)}</dt>
                  <dd className="min-w-0 truncate text-fg">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
            </dl>
          </Collapsible>
        )}
      </div>
      <span className="sr-only">{formatEnumLabel(entry.eventType)}</span>
    </li>
  );
}
