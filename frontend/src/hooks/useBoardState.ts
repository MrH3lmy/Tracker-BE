import { useState, type DragEvent } from 'react';
import type { TaskStatus } from '../validation/taskStatus';
import { isTaskStatus } from '../validation/taskStatus';
import type { TaskRecord } from '../components/tasks/taskTypes';

interface UseBoardStateOptions {
  tasks: TaskRecord[];
  onMoveTask: (id: number, body: { status: TaskStatus; position: number }) => void;
}

export interface BoardDropTarget {
  status: TaskStatus;
  position: number;
}

export function useBoardState({ tasks, onMoveTask }: UseBoardStateOptions) {
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<BoardDropTarget | null>(null);

  const moveTaskTo = (taskId: number, targetStatus: TaskStatus, position: number) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || !isTaskStatus(targetStatus)) return;
    if (task.status === targetStatus && task.position === position) return;
    onMoveTask(taskId, { status: targetStatus, position });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: number) => {
    setDraggingTaskId(taskId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => {
    if (draggingTaskId == null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget((current) => (current?.status === targetStatus && current.position === position ? current : { status: targetStatus, position }));
  };

  const clearDropTarget = () => setDropTarget(null);

  const handleDrop = (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => {
    event.preventDefault();
    event.stopPropagation();
    const taskId = Number(event.dataTransfer.getData('text/plain') || draggingTaskId);
    setDraggingTaskId(null);
    setDropTarget(null);
    if (!Number.isFinite(taskId)) return;
    moveTaskTo(taskId, targetStatus, position);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDropTarget(null);
  };

  return {
    draggingTaskId,
    dropTarget,
    setDraggingTaskId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    clearDropTarget,
    moveTaskTo,
  };
}
