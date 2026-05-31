import { useState, type DragEvent } from 'react';
import type { TaskStatus } from '../validation/taskStatus';
import { isTaskStatus } from '../validation/taskStatus';
import type { TaskRecord } from '../components/tasks/taskTypes';

interface UseBoardStateOptions {
  tasks: TaskRecord[];
  onMoveTask: (id: number, body: { status: TaskStatus; position: number }) => void;
}

export function useBoardState({ tasks, onMoveTask }: UseBoardStateOptions) {
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);

  const moveTaskTo = (taskId: number, targetStatus: TaskStatus, position: number) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || !isTaskStatus(targetStatus)) return;
    if (task.status === targetStatus && task.position === position) return;
    onMoveTask(taskId, { status: targetStatus, position });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: number) => {
    setDraggingTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => {
    event.preventDefault();
    event.stopPropagation();
    const taskId = Number(event.dataTransfer.getData('text/plain') || draggingTaskId);
    setDraggingTaskId(null);
    if (!Number.isFinite(taskId)) return;
    moveTaskTo(taskId, targetStatus, position);
  };

  return {
    draggingTaskId,
    setDraggingTaskId,
    handleDragStart,
    handleDrop,
    moveTaskTo,
  };
}
