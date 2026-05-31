import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardColumnData, TaskTreeNode } from './taskTypes';
import { BoardColumn } from './BoardColumn';

interface TaskBoardProps {
  columns: BoardColumnData[];
  busy: boolean;
  draggingTaskId: number | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

export function TaskBoard({ columns, busy, draggingTaskId, onDragStart, onDragEnd, onDrop, onStartSubtask }: TaskBoardProps) {
  return (
    <div className="task-board" aria-label="Task status board">
      {columns.map((column) => (
        <BoardColumn key={column.status} status={column.status} tasks={column.tasks} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragEnd={onDragEnd} onDrop={onDrop} onStartSubtask={onStartSubtask} />
      ))}
    </div>
  );
}
