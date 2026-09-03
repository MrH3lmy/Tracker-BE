import { useRef, useState, type KeyboardEvent } from 'react';
import { formatEnumLabel } from '../../lib/enumLabels';
import { ActiveFilterChips, type ActiveFilterChip } from './ActiveFilterChips';
import type { NoteFilterState } from './notesFilters';
import { NOTE_CONTENT_TYPES, humanizeContentType } from './notesPageHelpers';
import { NOTE_TYPE_VALUES, type NoteContentType, type NoteType } from './noteTypes';
import { Badge, Button, Field, Input, Popover, PopoverContent, PopoverTrigger, Select, cn } from '../ui';
import { Search, SlidersHorizontal, X } from '../ui/icons';

interface NotesSearchBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  filters: NoteFilterState;
  onPatchFilters: (patch: Partial<NoteFilterState>) => void;
  collections: Array<{ id: number; name: string }>;
  projects: Array<{ id: number; name: string }>;
  activeChips: ActiveFilterChip[];
  advancedFilterCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const TYPE_LENSES: Array<{ value: NoteType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  ...NOTE_TYPE_VALUES.map((type) => ({ value: type as NoteType | 'all', label: formatEnumLabel(type) })),
];

/**
 * Note-type lenses (issue #299). Typed notes drive discovery here rather than sitting as option
 * four of a select inside a popover. Implemented as a roving-focus toggle group: one tab stop,
 * arrow keys move between lenses, `aria-pressed` carries the state (never colour alone).
 */
function NoteTypeLenses({
  value,
  onChange,
}: {
  value: NoteType | 'all';
  onChange: (value: NoteType | 'all') => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TYPE_LENSES.findIndex((lens) => lens.value === value);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % TYPE_LENSES.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + TYPE_LENSES.length) % TYPE_LENSES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TYPE_LENSES.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(TYPE_LENSES[next].value);
    listRef.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="group"
      aria-label="Filter notes by type"
      onKeyDown={handleKeyDown}
      // The lens row scrolls inside itself on narrow screens; the page never scrolls sideways.
      className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {TYPE_LENSES.map((lens) => {
        const selected = lens.value === value;
        return (
          <button
            key={lens.value}
            type="button"
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(lens.value)}
            className={cn(
              'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-(--duration-fast)',
              selected
                ? 'border-brand bg-brand text-brand-fg'
                : 'border-line bg-card text-fg-muted hover:bg-inset hover:text-fg',
            )}
          >
            {lens.label}
          </button>
        );
      })}
    </div>
  );
}

export function NotesSearchBar({
  searchInput,
  onSearchInputChange,
  filters,
  onPatchFilters,
  collections,
  projects,
  activeChips,
  advancedFilterCount,
  hasActiveFilters,
  onClearFilters,
  searchInputRef,
}: NotesSearchBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label className="sr-only" htmlFor="noteSearch">
          Search your notes
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input
          id="noteSearch"
          ref={searchInputRef}
          type="search"
          value={searchInput}
          placeholder="Search your notes by title or content..."
          onChange={(event) => onSearchInputChange(event.target.value)}
          className="h-11 pr-10 pl-11 text-base"
        />
        {searchInput ? (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => onSearchInputChange('')}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <NoteTypeLenses value={filters.noteType} onChange={(noteType) => onPatchFilters({ noteType })} />

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Project" htmlFor="noteProjectFilter" className="min-w-40 flex-1">
          <Select
            id="noteProjectFilter"
            value={filters.projectId}
            onChange={(event) => onPatchFilters({ projectId: event.target.value })}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Collection" htmlFor="noteCollectionFilter" className="min-w-40 flex-1">
          <Select
            id="noteCollectionFilter"
            value={filters.collectionId}
            onChange={(event) => onPatchFilters({ collectionId: event.target.value })}
          >
            <option value="">All collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={String(collection.id)}>
                {collection.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tags" htmlFor="noteTagFilter" className="min-w-40 flex-1">
          <Input
            id="noteTagFilter"
            value={filters.tags}
            placeholder="e.g. backend, adr"
            onChange={(event) => onPatchFilters({ tags: event.target.value })}
          />
        </Field>

        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button aria-expanded={isAdvancedOpen} aria-controls="noteAdvancedFilters">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              More filters
              {advancedFilterCount > 0 ? (
                <Badge variant="brand" aria-label={`${advancedFilterCount} advanced filters active`}>
                  {advancedFilterCount}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id="noteAdvancedFilters"
            align="end"
            className="w-[min(34rem,calc(100vw-2rem))]"
            aria-label="Advanced note filters"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Content type" htmlFor="noteContentTypeFilter">
                <Select
                  id="noteContentTypeFilter"
                  value={filters.contentType}
                  onChange={(event) => onPatchFilters({ contentType: event.target.value as NoteContentType | 'all' })}
                >
                  <option value="all">All content types</option>
                  {NOTE_CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {humanizeContentType(type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Attachments" htmlFor="noteHasAttachmentsFilter">
                <Select
                  id="noteHasAttachmentsFilter"
                  value={filters.hasAttachments}
                  onChange={(event) => onPatchFilters({ hasAttachments: event.target.value as '' | 'true' | 'false' })}
                >
                  <option value="">Any</option>
                  <option value="true">Has attachments</option>
                  <option value="false">No attachments</option>
                </Select>
              </Field>
              <Field label="Linked task" htmlFor="noteLinkedTaskFilter">
                <Select
                  id="noteLinkedTaskFilter"
                  value={filters.linkedTask}
                  onChange={(event) => onPatchFilters({ linkedTask: event.target.value as '' | 'true' | 'false' })}
                >
                  <option value="">Any</option>
                  <option value="true">Linked</option>
                  <option value="false">Unlinked</option>
                </Select>
              </Field>
              <Field label="Tag status" htmlFor="noteUntaggedFilter">
                <Select
                  id="noteUntaggedFilter"
                  value={filters.untagged}
                  onChange={(event) => onPatchFilters({ untagged: event.target.value as '' | 'true' | 'false' })}
                >
                  <option value="">Any</option>
                  <option value="true">Untagged</option>
                  <option value="false">Tagged</option>
                </Select>
              </Field>
              <Field label="Tag match" htmlFor="noteTagMode">
                <Select
                  id="noteTagMode"
                  value={filters.tagMode}
                  onChange={(event) => onPatchFilters({ tagMode: event.target.value as 'any' | 'all' })}
                >
                  <option value="any">Any tag</option>
                  <option value="all">All tags</option>
                </Select>
              </Field>
              <Field label="Note type" htmlFor="noteTypeFilter">
                <Select
                  id="noteTypeFilter"
                  value={filters.noteType}
                  onChange={(event) => onPatchFilters({ noteType: event.target.value as NoteType | 'all' })}
                >
                  <option value="all">All note types</option>
                  {NOTE_TYPE_VALUES.map((type) => (
                    <option key={type} value={type}>
                      {formatEnumLabel(type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Created from" htmlFor="noteCreatedFrom">
                <Input
                  id="noteCreatedFrom"
                  type="date"
                  value={filters.createdFrom}
                  onChange={(event) => onPatchFilters({ createdFrom: event.target.value })}
                />
              </Field>
              <Field label="Created to" htmlFor="noteCreatedTo">
                <Input
                  id="noteCreatedTo"
                  type="date"
                  value={filters.createdTo}
                  onChange={(event) => onPatchFilters({ createdTo: event.target.value })}
                />
              </Field>
              <Field label="Updated from" htmlFor="noteUpdatedFrom">
                <Input
                  id="noteUpdatedFrom"
                  type="date"
                  value={filters.updatedFrom}
                  onChange={(event) => onPatchFilters({ updatedFrom: event.target.value })}
                />
              </Field>
              <Field label="Updated to" htmlFor="noteUpdatedTo">
                <Input
                  id="noteUpdatedTo"
                  type="date"
                  value={filters.updatedTo}
                  onChange={(event) => onPatchFilters({ updatedTo: event.target.value })}
                />
              </Field>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActiveFilterChips chips={activeChips} />
          {hasActiveFilters ? (
            <Button size="sm" variant="ghost" onClick={onClearFilters}>
              Clear all filters
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { NoteTypeLenses };
export type { NotesSearchBarProps };
