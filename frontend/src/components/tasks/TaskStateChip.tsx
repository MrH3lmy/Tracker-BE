import { Badge, type BadgeVariant } from '../ui';
import { AlertTriangle, CheckCircle2, Clock } from '../ui/icons';
import { WORK_STATE_LABEL, type TaskWorkState } from './taskLenses';

const VARIANT: Record<TaskWorkState, BadgeVariant> = {
  ready: 'positive',
  blocked: 'caution',
  waiting: 'neutral',
};

const ICON = {
  ready: CheckCircle2,
  blocked: AlertTriangle,
  waiting: Clock,
} as const;

export interface TaskStateChipProps {
  state: TaskWorkState;
  className?: string;
}

/**
 * The dependency/actionability axis, always icon **and** word - the UI UX Pro Max `ux` "Color
 * Only" rule (High) forbids carrying this meaning in colour alone. Deliberately a different badge
 * family from the manual workflow `Status` badge (see taskStyleUtils) so the two axes never read
 * as the same thing.
 */
export function TaskStateChip({ state, className }: TaskStateChipProps) {
  const Icon = ICON[state];
  return (
    <Badge variant={VARIANT[state]} className={className}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {WORK_STATE_LABEL[state]}
    </Badge>
  );
}
