import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatEnumLabel } from '../../lib/enumLabels';
import type { ActiveFilterChip } from './ActiveFilterChips';
import {
  EMPTY_NOTE_FILTERS,
  countAdvancedFilters,
  hasAnyActiveFilter,
  type NoteFilterState,
} from './notesFilters';
import { findSmartView, type NoteSmartView, type NoteSmartViewId } from './notesSmartViews';
import { humanizeContentType, type NotesViewMode } from './notesPageHelpers';
import { NOTE_TYPE_VALUES } from './noteTypes';

const SEARCH_DEBOUNCE_MS = 250;

export interface SavedViewShape {
  filters: Record<string, unknown>;
  sortField: string;
  sortDirection: string;
  viewType: string;
}

interface UseNotesWorkspaceOptions {
  collections: Array<{ id: number; name: string }>;
  projects: Array<{ id: number; name: string }>;
}

function isViewMode(value: string | null): value is NotesViewMode {
  return value === 'sticky' || value === 'list' || value === 'table' || value === 'timeline';
}

function filtersFromUrl(params: URLSearchParams): NoteFilterState {
  const smartView = findSmartView(params.get('view'));
  const typeParam = params.get('type')?.trim().toUpperCase() ?? '';
  return {
    ...EMPTY_NOTE_FILTERS,
    ...(smartView?.filters ?? {}),
    q: params.get('q')?.trim() || (smartView?.filters.q ?? ''),
    projectId: params.get('projectId')?.trim() ?? '',
    collectionId: params.get('collectionId')?.trim() ?? '',
    tags: params.get('tag')?.trim() || (smartView?.filters.tags ?? ''),
    noteType: (NOTE_TYPE_VALUES as readonly string[]).includes(typeParam)
      ? (typeParam as NoteFilterState['noteType'])
      : smartView?.filters.noteType ?? 'all',
  };
}

/**
 * All discovery state for the Notes workspace (issue #299): filters, sort, smart view, display
 * mode and the derived active-filter chips, kept in sync with the URL so `?projectId=`,
 * `?taskId=`, `?q=`, `?tag=`, `?type=` and `?view=` stay shareable.
 *
 * Search is debounced before it reaches the query key so typing does not fire a request per
 * keystroke (UI UX Pro Max, `ux` Search -> "Autocomplete: debounced fetch"); `searchInput` is the
 * value the text box shows, `filters.q` is the value the server sees.
 */
export function useNotesWorkspace({ collections, projects }: UseNotesWorkspaceOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTaskId = searchParams.get('taskId')?.trim() ?? '';

  const [filters, setFilters] = useState<NoteFilterState>(() => filtersFromUrl(searchParams));
  const [searchInput, setSearchInput] = useState(() => filtersFromUrl(searchParams).q);
  const [smartViewId, setSmartViewId] = useState<NoteSmartViewId | null>(
    () => findSmartView(searchParams.get('view'))?.id ?? 'all',
  );
  const [viewMode, setViewMode] = useState<NotesViewMode>(() => {
    const fromUrl = searchParams.get('mode');
    if (isViewMode(fromUrl)) return fromUrl;
    return findSmartView(searchParams.get('view'))?.viewMode ?? 'list';
  });
  const isFirstUrlSync = useRef(true);

  useEffect(() => {
    if (searchInput === filters.q) return;
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, q: searchInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters.q, searchInput]);

  // Mirror the parts of the workspace state that are worth linking to back into the URL. Only
  // these five keys round-trip; the long-tail filters stay in memory to keep links readable.
  // `replace: true` on purpose: a filter tweak or a search keystroke must not push a history
  // entry, or Back would walk backwards through a search term letter by letter instead of
  // returning to the project page the user arrived from.
  useEffect(() => {
    if (isFirstUrlSync.current) {
      isFirstUrlSync.current = false;
      return;
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        const assign = (key: string, value: string) => {
          if (value) next.set(key, value);
          else next.delete(key);
        };
        assign('view', smartViewId && smartViewId !== 'all' ? smartViewId : '');
        assign('q', filters.q.trim());
        assign('projectId', filters.projectId);
        assign('collectionId', filters.collectionId);
        assign('type', filters.noteType === 'all' ? '' : filters.noteType);
        return next;
      },
      { replace: true },
    );
  }, [filters.collectionId, filters.noteType, filters.projectId, filters.q, setSearchParams, smartViewId]);

  const patchFilters = useCallback((patch: Partial<NoteFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
    if (patch.q !== undefined) setSearchInput(patch.q);
  }, []);

  /**
   * Selecting a smart view is a navigation act, so it resets the other filters rather than
   * stacking onto them - except the project scope, which is the page's context and survives.
   * Narrowing controls (the type lenses, the context selects) patch instead, preserving state.
   */
  const selectSmartView = useCallback((view: NoteSmartView) => {
    setSmartViewId(view.id);
    setFilters((current) => ({
      ...EMPTY_NOTE_FILTERS,
      projectId: current.projectId,
      ...view.filters,
    }));
    setSearchInput(view.filters.q ?? '');
    if (view.viewMode) setViewMode(view.viewMode);
  }, []);

  const selectCollection = useCallback((collectionId: string) => {
    setSmartViewId(null);
    setFilters((current) => ({
      ...EMPTY_NOTE_FILTERS,
      projectId: current.projectId,
      collectionId,
    }));
    setSearchInput('');
  }, []);

  const applySavedView = useCallback((view: SavedViewShape) => {
    const saved = view.filters ?? {};
    const asString = (value: unknown) => (typeof value === 'string' ? value : '');
    const asTriState = (value: unknown): '' | 'true' | 'false' =>
      typeof value === 'boolean' ? (value ? 'true' : 'false') : '';
    setSmartViewId(null);
    setFilters((current) => ({
      ...EMPTY_NOTE_FILTERS,
      projectId: current.projectId,
      q: asString(saved.q),
      contentType: typeof saved.contentType === 'string' ? (saved.contentType as NoteFilterState['contentType']) : 'all',
      noteType: typeof saved.noteType === 'string' ? (saved.noteType as NoteFilterState['noteType']) : 'all',
      tags: asString(saved.tags),
      collectionId: saved.collectionId == null ? '' : String(saved.collectionId),
      hasAttachments: asTriState(saved.hasAttachments),
      linkedTask: asTriState(saved.linkedTask),
      untagged: asTriState(saved.untagged),
      tagMode: saved.tagMode === 'all' ? 'all' : 'any',
      createdFrom: asString(saved.createdFrom),
      createdTo: asString(saved.createdTo),
      updatedFrom: asString(saved.updatedFrom),
      updatedTo: asString(saved.updatedTo),
      sortBy: (view.sortField || 'updatedAt') as NoteFilterState['sortBy'],
      sortDirection: view.sortDirection === 'asc' ? 'asc' : 'desc',
    }));
    setSearchInput(asString(saved.q));
    if (isViewMode(view.viewType)) setViewMode(view.viewType);
  }, []);

  const clearFilters = useCallback(() => {
    setSmartViewId('all');
    setFilters({ ...EMPTY_NOTE_FILTERS });
    setSearchInput('');
  }, []);

  /** The payload `saveCurrentView` posts - mirrors exactly what is on screen. */
  const currentSavedViewPayload = useMemo(
    () => ({
      filters: {
        q: filters.q,
        contentType: filters.contentType === 'all' ? undefined : filters.contentType,
        noteType: filters.noteType === 'all' ? undefined : filters.noteType,
        tags: filters.tags,
        collectionId: filters.collectionId || undefined,
        hasAttachments: filters.hasAttachments === '' ? undefined : filters.hasAttachments === 'true',
        linkedTask: filters.linkedTask === '' ? undefined : filters.linkedTask === 'true',
        untagged: filters.untagged === '' ? undefined : filters.untagged === 'true',
        tagMode: filters.tagMode,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        updatedFrom: filters.updatedFrom,
        updatedTo: filters.updatedTo,
      },
      sortField: filters.sortBy,
      sortDirection: filters.sortDirection,
      viewType: viewMode,
    }),
    [filters, viewMode],
  );

  /**
   * Whether the user has narrowed beyond what the active smart view itself applies. Drives the
   * empty state: an empty "Decisions" view should teach how to fill it, not offer to clear
   * filters the user never set.
   */
  const hasFiltersBeyondSmartView = useMemo(() => {
    const view = findSmartView(smartViewId);
    const baseline: NoteFilterState = {
      ...EMPTY_NOTE_FILTERS,
      projectId: filters.projectId,
      ...(view?.filters ?? {}),
    };
    return (Object.keys(baseline) as Array<keyof NoteFilterState>).some((key) => filters[key] !== baseline[key]);
  }, [filters, smartViewId]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const collectionName = collections.find((item) => String(item.id) === filters.collectionId)?.name;
    const projectName = projects.find((item) => String(item.id) === filters.projectId)?.name;
    return [
      filters.q.trim() ? { key: 'q', label: `Search: ${filters.q.trim()}`, onClear: () => patchFilters({ q: '' }) } : null,
      projectName ? { key: 'project', label: `Project: ${projectName}`, onClear: () => patchFilters({ projectId: '' }) } : null,
      filters.noteType !== 'all' ? { key: 'noteType', label: `Type: ${formatEnumLabel(filters.noteType)}`, onClear: () => patchFilters({ noteType: 'all' }) } : null,
      collectionName ? { key: 'collection', label: `Collection: ${collectionName}`, onClear: () => patchFilters({ collectionId: '' }) } : null,
      filters.tags.trim() ? { key: 'tag', label: `Tag: ${filters.tags.trim()}`, onClear: () => patchFilters({ tags: '' }) } : null,
      filters.contentType !== 'all' ? { key: 'contentType', label: `Content: ${humanizeContentType(filters.contentType)}`, onClear: () => patchFilters({ contentType: 'all' }) } : null,
      filters.hasAttachments ? { key: 'attachments', label: filters.hasAttachments === 'true' ? 'Has attachments' : 'No attachments', onClear: () => patchFilters({ hasAttachments: '' }) } : null,
      filters.linkedTask ? { key: 'linkedTask', label: filters.linkedTask === 'true' ? 'Linked to a task' : 'Not linked to a task', onClear: () => patchFilters({ linkedTask: '' }) } : null,
      filters.untagged ? { key: 'untagged', label: filters.untagged === 'true' ? 'Untagged' : 'Tagged', onClear: () => patchFilters({ untagged: '' }) } : null,
      filters.tagMode !== 'any' ? { key: 'tagMode', label: 'Match all tags', onClear: () => patchFilters({ tagMode: 'any' }) } : null,
      filters.createdFrom ? { key: 'createdFrom', label: `Created from ${filters.createdFrom}`, onClear: () => patchFilters({ createdFrom: '' }) } : null,
      filters.createdTo ? { key: 'createdTo', label: `Created to ${filters.createdTo}`, onClear: () => patchFilters({ createdTo: '' }) } : null,
      filters.updatedFrom ? { key: 'updatedFrom', label: `Updated from ${filters.updatedFrom}`, onClear: () => patchFilters({ updatedFrom: '' }) } : null,
      filters.updatedTo ? { key: 'updatedTo', label: `Updated to ${filters.updatedTo}`, onClear: () => patchFilters({ updatedTo: '' }) } : null,
    ].filter((chip): chip is ActiveFilterChip => chip !== null);
  }, [collections, filters, patchFilters, projects]);

  return {
    linkedTaskId,
    filters,
    patchFilters,
    searchInput,
    setSearchInput,
    smartViewId,
    selectSmartView,
    selectCollection,
    applySavedView,
    clearFilters,
    currentSavedViewPayload,
    viewMode,
    setViewMode,
    activeChips,
    advancedFilterCount: countAdvancedFilters(filters),
    hasActiveFilters: hasAnyActiveFilter(filters),
    hasFiltersBeyondSmartView,
  };
}
