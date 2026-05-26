export const TASK_STATUS_VALUES = [
  'BACKLOG',
  'NOT_STARTED',
  'IN_PROGRESS',
  'WAITING',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUS_VALUES.includes(value as TaskStatus);
}
