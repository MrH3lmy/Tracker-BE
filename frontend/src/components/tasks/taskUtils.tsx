import type { ReactNode } from 'react';
import type { TaskRecord, TaskTreeNode } from './taskTypes';

export const RISK_LEVEL_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const AREA_VALUES = ['WORK', 'STUDY', 'PERSONAL', 'HEALTH', 'FAMILY'] as const;
export const EFFORT_VALUES = ['QUICK', 'MEDIUM', 'DEEP_WORK', 'LARGE'] as const;

export const formatValue = (value?: string | boolean | number | null) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value ? String(value) : '—';
};

export const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const isOverdue = (task: TaskRecord) => {
  if (task.overdue) return true;
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

export const renderDueDate = (task: TaskRecord, overdue = isOverdue(task)): ReactNode => {
  const formattedDate = formatDate(task.dueDate);
  if (!overdue) return formattedDate;
  return <><span className="task-overdue-label">Overdue</span><span>{formattedDate}</span></>;
};

export const uniqueOptions = (tasks: TaskRecord[], key: 'area' | 'effort') => Array.from(new Set(tasks.map((task) => task[key]).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

export const sortTasksForBoard = <T extends TaskRecord>(tasks: T[]) => [...tasks].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

export const taskMatchesSearch = (task: TaskRecord, searchTerm: string) => {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) return true;
  return [task.title, task.description, task.area, task.track, task.phase, task.riskReason].some((value) => value?.toLowerCase().includes(needle));
};

export const buildTaskTree = (tasks: TaskRecord[], sortNodes: (tasks: TaskTreeNode[]) => TaskTreeNode[] = sortTasksForBoard): TaskTreeNode[] => {
  const nodes = new Map<number, TaskTreeNode>();
  tasks.forEach((task) => nodes.set(task.id, { ...task, subtasks: [] }));
  const roots: TaskTreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentTaskId ? nodes.get(node.parentTaskId) : undefined;
    if (parent) parent.subtasks.push(node);
    else roots.push(node);
  });
  nodes.forEach((node) => { node.subtasks = sortNodes(node.subtasks); });
  return sortNodes(roots);
};

export const subtaskSummary = (task: TaskRecord) => {
  const total = task.subtaskCount ?? task.subtaskIds?.length ?? 0;
  if (total === 0) return null;
  const completed = task.completedSubtaskCount ?? 0;
  const percent = task.subtaskProgressPercent ?? Math.round((completed * 100) / total);
  return `${completed}/${total} subtasks (${percent}%)`;
};
