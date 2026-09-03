import type { ComponentType } from 'react';
import {
  Archive,
  Camera,
  Clock,
  Flag,
  Library,
  Link2,
  ListChecks,
  ListTodo,
  RefreshCw,
  Search,
  Tag,
  Users,
  Wrench,
} from '../ui/icons';
import type { NotesViewMode } from './notesPageHelpers';
import type { NoteFilterState } from './notesFilters';

export type NoteSmartViewId =
  | 'all'
  | 'recent'
  | 'meetings'
  | 'decisions'
  | 'research'
  | 'technical'
  | 'requirements'
  | 'retrospectives'
  | 'screenshots'
  | 'taskNotes'
  | 'checklists'
  | 'untagged'
  | 'archived';

export interface NoteSmartView {
  id: NoteSmartViewId;
  label: string;
  /** Lucide icon from the app's curated set - decorative, always rendered aria-hidden. */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** One line explaining what the view holds; used by the nav title and the empty state. */
  description: string;
  /** What to do when the view has no notes - the empty state's teaching sentence. */
  emptyHint: string;
  /** Filters this view applies on top of the cleared filter state (project context is kept). */
  filters: Partial<NoteFilterState>;
  viewMode?: NotesViewMode;
}

/**
 * The built-in knowledge views (issue #299). These replace the old
 * "default saved views" list plus the sidebar's Recent / Task-linked / Archived
 * teaser lists: each one is a real server-side query against `GET /api/v1/notes`
 * rather than a client-side top-5 slice of the already-loaded page, so selecting
 * one filters the whole library instead of showing a preview.
 */
export const NOTE_SMART_VIEWS: NoteSmartView[] = [
  {
    id: 'all',
    label: 'All notes',
    icon: Library,
    description: 'Everything you have captured',
    emptyHint: 'Capture your first note to start building your library.',
    filters: {},
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: Clock,
    description: 'Most recently edited first',
    emptyHint: 'Notes you edit will surface here first.',
    filters: { sortBy: 'updatedAt', sortDirection: 'desc' },
  },
  {
    id: 'meetings',
    label: 'Meeting notes',
    icon: Users,
    description: 'Notes typed as Meeting',
    emptyHint: 'Set a note’s type to Meeting to collect it here.',
    filters: { noteType: 'MEETING' },
  },
  {
    id: 'decisions',
    label: 'Decisions',
    icon: Flag,
    description: 'Notes typed as Decision',
    emptyHint: 'Set a note’s type to Decision to record what you chose and why.',
    filters: { noteType: 'DECISION' },
  },
  {
    id: 'research',
    label: 'Research',
    icon: Search,
    description: 'Notes typed as Research',
    emptyHint: 'Set a note’s type to Research to gather your reading here.',
    filters: { noteType: 'RESEARCH' },
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: Wrench,
    description: 'Notes typed as Technical',
    emptyHint: 'Set a note’s type to Technical for implementation detail.',
    filters: { noteType: 'TECHNICAL' },
  },
  {
    id: 'requirements',
    label: 'Requirements',
    icon: ListChecks,
    description: 'Notes typed as Requirements',
    emptyHint: 'Set a note’s type to Requirements to track what must be true.',
    filters: { noteType: 'REQUIREMENTS' },
  },
  {
    id: 'retrospectives',
    label: 'Retrospectives',
    icon: RefreshCw,
    description: 'Notes typed as Retrospective',
    emptyHint: 'Set a note’s type to Retrospective after you review a cycle.',
    filters: { noteType: 'RETROSPECTIVE' },
  },
  {
    id: 'screenshots',
    label: 'Screenshots',
    icon: Camera,
    description: 'Notes with an image attached',
    emptyHint: 'Attach a screenshot to a note, or capture a screen area, to fill this view.',
    filters: { hasAttachments: 'true' },
  },
  {
    id: 'taskNotes',
    label: 'Task notes',
    icon: Link2,
    description: 'Notes linked to a task',
    emptyHint: 'Link a note to a task, or convert note content into one, to fill this view.',
    filters: { linkedTask: 'true' },
  },
  {
    id: 'checklists',
    label: 'Checklists',
    icon: ListTodo,
    description: 'Markdown notes containing checkboxes',
    emptyHint: 'Add "- [ ]" checklist lines to a Markdown note to collect it here.',
    filters: { contentType: 'MARKDOWN', q: '- [ ]' },
  },
  {
    id: 'untagged',
    label: 'Untagged',
    icon: Tag,
    description: 'Notes with no tags yet',
    emptyHint: 'Every note is tagged — nothing to triage.',
    filters: { untagged: 'true' },
    viewMode: 'table',
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: Archive,
    description: 'Notes tagged "archived"',
    emptyHint: 'Tag a note with "archived" to move it out of your working set.',
    filters: { tags: 'archived', tagMode: 'all' },
  },
];

const SMART_VIEW_BY_ID = new Map(NOTE_SMART_VIEWS.map((view) => [view.id, view]));

export function findSmartView(id: string | null | undefined): NoteSmartView | undefined {
  return id ? SMART_VIEW_BY_ID.get(id as NoteSmartViewId) : undefined;
}
