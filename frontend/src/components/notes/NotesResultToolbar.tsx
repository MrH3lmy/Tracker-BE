import type { ComponentType } from 'react';
import { NOTE_SORT_OPTIONS, type NoteSortBy, type NotesViewMode } from './notesPageHelpers';
import { Button, Select, cn } from '../ui';
import { Clock, Grid2x2, List, Table2 } from '../ui/icons';

const VIEW_MODES: Array<{
  value: NotesViewMode;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}> = [
  { value: 'list', label: 'List', icon: List },
  { value: 'sticky', label: 'Sticky board', icon: Grid2x2 },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'timeline', label: 'Timeline', icon: Clock },
];

interface NotesResultToolbarProps {
  /** Number of notes actually rendered. Never a global total - see notes-workspace.md §6. */
  loadedCount: number;
  isTruncated: boolean;
  isFetching: boolean;
  viewMode: NotesViewMode;
  onViewModeChange: (mode: NotesViewMode) => void;
  sortBy: NoteSortBy;
  onSortByChange: (value: NoteSortBy) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
}

/**
 * Result count + view switcher + sort (issue #299).
 *
 * The four-up text segmented control became an icon switcher with a visible label from `md` up
 * and an accessible name always: four full words never fit next to the sort controls at 375px.
 * The count is deliberately phrased as "Showing N" - the list endpoint returns a bounded page and
 * no total, so a bare "N notes" would read as a global statistic the backend cannot support.
 */
export function NotesResultToolbar({
  loadedCount,
  isTruncated,
  isFetching,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
}: NotesResultToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
      <p className="shrink-0 text-sm text-fg-muted" role="status" aria-live="polite">
        <span className="font-mono font-medium tabular-nums text-fg">{loadedCount}</span>{' '}
        {isTruncated ? 'notes loaded so far' : loadedCount === 1 ? 'note' : 'notes'}
        {isFetching ? <span className="ml-2 text-fg-subtle">Updating…</span> : null}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Note view modes"
          className="flex items-center gap-0.5 rounded-lg bg-inset p-1"
        >
          {VIEW_MODES.map((mode) => {
            const selected = mode.value === viewMode;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={mode.label}
                title={mode.label}
                tabIndex={selected ? 0 : -1}
                onClick={() => onViewModeChange(mode.value)}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-(--duration-fast)',
                  selected ? 'bg-card text-fg shadow-xs' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* The shared Select is width-100% by design, so its size is set by this wrapper rather
            than by fighting the shared control class. */}
        <div className="w-40 shrink-0">
          <label className="sr-only" htmlFor="noteSortBy">
            Sort notes by
          </label>
          <Select
            id="noteSortBy"
            className="h-9"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as NoteSortBy)}
          >
            {NOTE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          size="sm"
          className="h-9 shrink-0"
          aria-label={sortDirection === 'desc' ? 'Sorted descending. Sort ascending instead.' : 'Sorted ascending. Sort descending instead.'}
          onClick={() => onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc')}
        >
          {sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>
    </div>
  );
}
