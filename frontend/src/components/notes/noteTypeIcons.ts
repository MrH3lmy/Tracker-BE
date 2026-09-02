import type { ComponentType } from 'react';
import { Flag, ListChecks, RefreshCw, Search, StickyNote, Users, Wrench } from '../ui/icons';
import type { NoteType } from './noteTypes';

/**
 * One icon per note type (issue #296), from the app's existing curated lucide set - no new
 * per-type colours, to avoid a 7-colour chip wall (design-system/tracker-be/pages/notes.md).
 * Lives outside the badge component so result cards and navigation can use the same vocabulary.
 */
export const NOTE_TYPE_ICON: Record<NoteType, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  GENERAL: StickyNote,
  MEETING: Users,
  RESEARCH: Search,
  TECHNICAL: Wrench,
  REQUIREMENTS: ListChecks,
  DECISION: Flag,
  RETROSPECTIVE: RefreshCw,
};
