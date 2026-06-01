import styles from './TaskCard.module.css';

const statusClassByStatus: Record<string, string> = {
  BACKLOG: styles.statusTaskBacklog,
  NOT_STARTED: styles.statusTaskNotStarted,
  IN_PROGRESS: styles.statusTaskInProgress,
  WAITING: styles.statusTaskWaiting,
  BLOCKED: styles.statusTaskBlocked,
  DONE: styles.statusTaskDone,
  CANCELLED: styles.statusTaskCancelled,
  unknown: styles.statusTaskUnknown,
};

export const taskStatusClassName = (status?: string) => [
  'status-badge',
  styles.statusBadge,
  statusClassByStatus[status ?? 'unknown'] ?? styles.statusTaskUnknown,
].filter(Boolean).join(' ');
