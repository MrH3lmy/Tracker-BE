import type { TaskRecord } from './taskTypes';

const nullableValue = <T,>(value: T | undefined | null) => value ?? null;

export const buildTaskUpdateBody = (task: TaskRecord, updates: Partial<TaskRecord>) => {
  const next = { ...task, ...updates };
  return {
    title: next.title,
    description: nullableValue(next.description),
    dueDate: nullableValue(next.dueDate?.slice(0, 10)),
    startDate: nullableValue(next.startDate?.slice(0, 10)),
    estimatedMinutes: nullableValue(next.estimatedMinutes),
    actualMinutes: nullableValue(next.actualMinutes),
    riskLevel: nullableValue(next.riskLevel),
    riskReason: nullableValue(next.riskReason),
    track: nullableValue(next.track),
    phase: nullableValue(next.phase),
    parentTaskId: nullableValue(next.parentTaskId),
    important: Boolean(next.important),
    status: nullableValue(next.status),
    area: nullableValue(next.area),
    effort: nullableValue(next.effort),
    blockedReason: nullableValue(next.blockedReason),
    waitingOn: nullableValue(next.waitingOn),
    followUpDate: nullableValue(next.followUpDate?.slice(0, 10)),
    boardColumnId: nullableValue(next.boardColumnId),
    position: nullableValue(next.position),
    dependencyIds: next.dependencyIds ?? [],
  };
};
