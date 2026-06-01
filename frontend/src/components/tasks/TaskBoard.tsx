import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardDropTarget } from '../../hooks/useBoardState';
import type { BoardColumnData, TaskRecord, TaskTreeNode } from './taskTypes';
import { BoardColumn } from './BoardColumn';
import styles from './TaskBoard.module.css';

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
  onComplete: (taskId: number) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onUpdateTask: (task: TaskRecord, updates: Partial<TaskRecord>) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

export function TaskBoard({ columns, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: TaskBoardProps) {
  return (
    <div className={styles.board} aria-label="Task status board">
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
          onComplete={onComplete}
          onChangeStatus={onChangeStatus}
          onUpdateTask={onUpdateTask}
          onSnoozeFollowUp={onSnoozeFollowUp}
          onRemoveDependency={onRemoveDependency}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
