import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardDropTarget } from '../../hooks/useBoardState';
import type { BoardColumnData, TaskTreeNode } from './taskTypes';
import { BoardColumn } from './BoardColumn';

interface TaskBoardProps {
  columns: BoardColumnData[];
  busy: boolean;
  draggingTaskId: number | null;
  dropTarget: BoardDropTarget | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragOver: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onClearDropTarget: () => void;
  onMoveTaskTo: (taskId: number, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

export function TaskBoard({ columns, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask }: TaskBoardProps) {
  return (
    <div className="task-board" aria-label="Task status board">
      {columns.map((column, columnIndex) => (
        <BoardColumn
          key={column.status}
          status={column.status}
          statusIndex={columnIndex}
          statuses={columns.map(({ status }) => status)}
          tasks={column.tasks}
          busy={busy}
          draggingTaskId={draggingTaskId}
          dropTarget={dropTarget}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDrop={onDrop}
          onClearDropTarget={onClearDropTarget}
          onMoveTaskTo={onMoveTaskTo}
          onStartSubtask={onStartSubtask}
        />
      ))}
    </div>
  );
}
