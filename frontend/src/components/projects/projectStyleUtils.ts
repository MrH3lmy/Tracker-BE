import type { BadgeVariant } from '../ui';

const statusVariantByStatus: Record<string, BadgeVariant> = {
  PLANNING: 'neutral',
  ACTIVE: 'brand',
  AT_RISK: 'caution',
  ON_HOLD: 'outline',
  DONE: 'positive',
  ARCHIVED: 'neutral',
};

export const projectStatusVariant = (status?: string): BadgeVariant => statusVariantByStatus[status ?? ''] ?? 'neutral';

const riskVariantByLevel: Record<string, BadgeVariant> = {
  LOW: 'positive',
  MEDIUM: 'caution',
  HIGH: 'critical',
};

export const projectRiskVariant = (riskLevel?: string): BadgeVariant => riskVariantByLevel[riskLevel ?? ''] ?? 'neutral';
