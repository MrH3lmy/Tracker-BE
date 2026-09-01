import { Badge } from '../ui';
import { Flag, ListChecks, RefreshCw, Search, StickyNote, Users, Wrench } from '../ui/icons';
import { formatEnumLabel } from '../../lib/enumLabels';
import type { NoteType } from './noteTypes';

const NOTE_TYPE_ICON: Record<NoteType, typeof StickyNote> = {
  GENERAL: StickyNote,
  MEETING: Users,
  RESEARCH: Search,
  TECHNICAL: Wrench,
  REQUIREMENTS: ListChecks,
  DECISION: Flag,
  RETROSPECTIVE: RefreshCw,
};

export interface NoteTypeBadgeProps {
  noteType?: NoteType;
  className?: string;
}

/**
 * One icon per note type (issue #296), reusing the app's existing curated icon set - no new
 * per-type colors, to avoid a 7-color chip wall (design-system/tracker-be/pages/notes.md).
 */
export function NoteTypeBadge({ noteType, className }: NoteTypeBadgeProps) {
  if (!noteType) return null;
  const Icon = NOTE_TYPE_ICON[noteType];
  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3 w-3" aria-hidden />
      {formatEnumLabel(noteType)}
    </Badge>
  );
}
