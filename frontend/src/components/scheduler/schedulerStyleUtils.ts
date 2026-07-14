import type { BadgeVariant } from '../ui';
import type { SchedulePriority } from './schedulerTypes';

const priorityVariantByLevel: Record<SchedulePriority, BadgeVariant> = {
  CRITICAL: 'critical',
  HIGH: 'caution',
  MEDIUM: 'brand',
  LOW: 'neutral',
};

export const schedulePriorityVariant = (priorityLevel?: SchedulePriority): BadgeVariant =>
  priorityVariantByLevel[priorityLevel ?? 'MEDIUM'];

export type Focus = 'all' | 'work' | 'training';

const WORK_AREAS = new Set(['WORK', 'STUDY']);
const TRAINING_AREAS = new Set(['PERSONAL', 'HEALTH', 'FAMILY']);

export const matchesFocus = (area: string | undefined, focus: Focus): boolean => {
  if (focus === 'all') return true;
  if (focus === 'work') return Boolean(area && WORK_AREAS.has(area));
  return !area || TRAINING_AREAS.has(area);
};
