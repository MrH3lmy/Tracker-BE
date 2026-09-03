import type { NoteContentType, NoteType } from './noteTypes';
import type { NoteSortBy } from './notesPageHelpers';

/**
 * Every discovery filter the Notes workspace can apply, in one object (issue #299).
 *
 * Each field maps 1:1 onto a `GET /api/v1/notes` request parameter, so nothing here is
 * re-implemented client-side; `useNotesWorkspace` hands the whole object to `useNotesQuery`.
 * Tri-state string filters ("" | "true" | "false") keep the exact shape the API layer already
 * expects, where "" means "the parameter is not sent at all".
 */
export interface NoteFilterState {
  q: string;
  noteType: NoteType | 'all';
  contentType: NoteContentType | 'all';
  collectionId: string;
  projectId: string;
  tags: string;
  tagMode: 'any' | 'all';
  hasAttachments: '' | 'true' | 'false';
  linkedTask: '' | 'true' | 'false';
  untagged: '' | 'true' | 'false';
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  sortBy: NoteSortBy;
  sortDirection: 'asc' | 'desc';
}

export const EMPTY_NOTE_FILTERS: NoteFilterState = {
  q: '',
  noteType: 'all',
  contentType: 'all',
  collectionId: '',
  projectId: '',
  tags: '',
  tagMode: 'any',
  hasAttachments: '',
  linkedTask: '',
  untagged: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
  sortBy: 'updatedAt',
  sortDirection: 'desc',
};

/** Filters shown behind the "More filters" disclosure rather than on the main bar. */
export const ADVANCED_FILTER_KEYS = [
  'contentType',
  'hasAttachments',
  'linkedTask',
  'untagged',
  'tagMode',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const;

function isSet(filters: NoteFilterState, key: keyof NoteFilterState): boolean {
  const value = filters[key];
  if (key === 'noteType' || key === 'contentType') return value !== 'all';
  if (key === 'tagMode') return value !== 'any';
  return typeof value === 'string' && value.trim() !== '';
}

/** How many long-tail filters are active - drives the count badge on "More filters". */
export function countAdvancedFilters(filters: NoteFilterState): number {
  return ADVANCED_FILTER_KEYS.filter((key) => isSet(filters, key)).length;
}

/**
 * Whether anything is narrowing the result set. Sort is deliberately excluded: re-ordering is not
 * a filter, and offering "clear filters" for it would be misleading.
 */
export function hasAnyActiveFilter(filters: NoteFilterState): boolean {
  const keys: Array<keyof NoteFilterState> = [
    'q',
    'noteType',
    'contentType',
    'collectionId',
    'projectId',
    'tags',
    'tagMode',
    'hasAttachments',
    'linkedTask',
    'untagged',
    'createdFrom',
    'createdTo',
    'updatedFrom',
    'updatedTo',
  ];
  return keys.some((key) => isSet(filters, key));
}

/**
 * Turns the filter object into the argument shape `useNotesQuery` expects. Kept separate from the
 * hook so the mapping stays trivially reviewable next to the filter definition.
 */
export function toNotesQueryFilters(filters: NoteFilterState, taskId: string, size: number) {
  return {
    q: filters.q,
    contentType: filters.contentType,
    taskId,
    collectionId: filters.collectionId,
    projectId: filters.projectId,
    noteType: filters.noteType,
    tags: filters.tags,
    hasAttachments: filters.hasAttachments === '' ? ('' as const) : filters.hasAttachments === 'true',
    linkedTask: filters.linkedTask === '' ? ('' as const) : filters.linkedTask === 'true',
    untagged: filters.untagged === '' ? ('' as const) : filters.untagged === 'true',
    tagMode: filters.tagMode,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    updatedFrom: filters.updatedFrom,
    updatedTo: filters.updatedTo,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    size,
  };
}
