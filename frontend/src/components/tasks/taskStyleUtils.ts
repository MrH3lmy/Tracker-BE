import type { BadgeVariant } from '../ui';

const statusVariantByStatus: Record<string, BadgeVariant> = {
  BACKLOG: 'neutral',
  NOT_STARTED: 'outline',
  IN_PROGRESS: 'brand',
  WAITING: 'caution',
  BLOCKED: 'critical',
  DONE: 'positive',
  CANCELLED: 'neutral',
};

export const taskStatusVariant = (status?: string): BadgeVariant =>
  statusVariantByStatus[status ?? ''] ?? 'neutral';

export const riskVariantByLevel: Record<string, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'caution',
  HIGH: 'critical',
  CRITICAL: 'critical',
};
