import { Button } from '../ui';
import { X } from '../ui/icons';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface TaskActiveFiltersProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}

/**
 * The old page said "3 filters / sort applied." and gave no way to see or remove any of them.
 * Each chip is a real `<button>` with its own accessible name, per the skill's `ux` "Compact
 * Control Semantics" (Critical) rule, and the collection wraps rather than clipping, per
 * "Chip Collection Reflow" (High).
 */
export function TaskActiveFilters({ chips, onClearAll }: TaskActiveFiltersProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 rounded-full border border-line bg-inset px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors duration-(--duration-fast) hover:bg-neutral-soft hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="min-w-0 truncate whitespace-nowrap">{chip.label}</span>
          <X className="h-3 w-3 shrink-0" aria-hidden />
        </button>
      ))}
      <Button size="sm" variant="ghost" onClick={onClearAll}>Clear filters</Button>
    </div>
  );
}
