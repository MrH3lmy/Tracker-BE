/**
 * Converts backend enum values (SCREAMING_SNAKE_CASE) into user-facing labels.
 * Keep raw enum values out of any screen a normal user sees; use this at the
 * point where a status/priority/reason code is rendered as text.
 */
const ENUM_LABEL_OVERRIDES: Record<string, string> = {
  BACKLOG: 'Backlog',
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  WAITING: 'Waiting',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
  DO_NOW: 'Do now',
  SCHEDULE: 'Schedule',
  DELEGATE: 'Delegate',
  DELETE: 'Delete',
  DEEP_WORK: 'Deep work',
  QUICK: 'Quick',
  FOLLOW_UP_OVERDUE: 'Follow-up overdue',
  FOLLOW_UP_TODAY: 'Follow-up today',
  FOLLOW_UP_SOON: 'Follow-up soon',
  DUE_TODAY: 'Due today',
  DUE_SOON: 'Due soon',
  ALREADY_IN_PROGRESS: 'Already in progress',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function formatEnumLabel(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (ENUM_LABEL_OVERRIDES[stringValue]) return ENUM_LABEL_OVERRIDES[stringValue];
  if (!/^[A-Z0-9_]+$/.test(stringValue)) return stringValue;

  return stringValue
    .toLowerCase()
    .split('_')
    .join(' ')
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase());
}
