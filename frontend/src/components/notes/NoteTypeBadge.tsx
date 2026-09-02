import { Badge } from '../ui';
import { NOTE_TYPE_ICON } from './noteTypeIcons';
import { formatEnumLabel } from '../../lib/enumLabels';
import type { NoteType } from './noteTypes';

export interface NoteTypeBadgeProps {
  noteType?: NoteType;
  className?: string;
}

/**
 * Outline badge for a note's type. Used where a note appears outside the Notes workspace
 * (project tabs, tables); inside a result card the type is part of the meta line instead,
 * so a scanning user does not face a badge on every row (issue #299).
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
