import { useMemo, useState } from 'react';
import { HABIT_PRESETS, type HabitCategory, type HabitPreset } from './habitTypes';
import { HABIT_CATEGORY_LABELS } from './habitPresentation';
import { EmptyState, Input, cn } from '../ui';
import { Search } from '../ui/icons';

interface HabitTemplateSelectorProps {
  selectedLabel?: string;
  onSelect: (preset: HabitPreset) => void;
  disabled?: boolean;
}

// Health, Study, Work, Personal, Family - display order for grouped sections.
const CATEGORY_ORDER: HabitCategory[] = ['HEALTH', 'STUDY', 'WORK', 'PERSONAL', 'FAMILY'];

const matchesSearch = (preset: HabitPreset, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    preset.label.toLowerCase().includes(q) ||
    preset.title.toLowerCase().includes(q) ||
    Boolean(preset.description?.toLowerCase().includes(q))
  );
};

export function HabitTemplateSelector({ selectedLabel, onSelect, disabled = false }: HabitTemplateSelectorProps) {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const filtered = HABIT_PRESETS.filter((preset) => matchesSearch(preset, search));
    return CATEGORY_ORDER.map((category) => ({
      category,
      presets: filtered.filter((preset) => (preset.area ?? 'PERSONAL') === category),
    })).filter((group) => group.presets.length > 0);
  }, [search]);

  const hasResults = groups.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-fg-muted">Start from a template</p>
        <label className="relative w-44" htmlFor="habitTemplateSearch">
          <span className="sr-only">Search templates</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            id="habitTemplateSearch"
            type="search"
            className="h-8 pl-8 text-xs"
            placeholder="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>

      {hasResults ? (
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">
                {HABIT_CATEGORY_LABELS[group.category]}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`${HABIT_CATEGORY_LABELS[group.category]} habit templates`}>
                {group.presets.map((preset) => {
                  const selected = preset.label === selectedLabel;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(preset)}
                      disabled={disabled}
                      className={cn(
                        'flex min-w-20 flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-center transition-colors duration-(--duration-fast) disabled:opacity-50',
                        selected ? 'border-brand bg-brand-soft shadow-2xs' : 'border-line bg-card hover:border-brand/50',
                      )}
                    >
                      <span className="text-lg" aria-hidden>{preset.icon}</span>
                      <span className={cn('text-xs font-medium', selected ? 'text-brand' : 'text-fg-muted')}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No templates match your search" description="Try a different keyword, or clear the search to see all templates." />
      )}
    </div>
  );
}
