import type { DragEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardDropTarget } from '../../hooks/useBoardState';
import type { BoardColumnData, TaskRecord, TaskTreeNode } from './taskTypes';
import { BoardColumn } from './BoardColumn';
import styles from './TaskBoard.module.css';

const MOBILE_BOARD_QUERY = '(max-width: 767px)';

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
  onCreateTaskForStatus: (status: TaskStatus) => void;
  onComplete: (taskId: number) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onUpdateTask: (task: TaskRecord, updates: Partial<TaskRecord>) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

interface BoardColumnRendererProps extends Omit<TaskBoardProps, 'columns'> {
  column: BoardColumnData;
  statusIndex: number;
  statuses: TaskStatus[];
}

function isMobileBoardViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_BOARD_QUERY).matches;
}

function BoardColumnRenderer({ column, statusIndex, statuses, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask, onCreateTaskForStatus, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: BoardColumnRendererProps) {
  return (
    <BoardColumn
      status={column.status}
      statusIndex={statusIndex}
      statuses={statuses}
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
      onCreateTaskForStatus={onCreateTaskForStatus}
      onComplete={onComplete}
      onChangeStatus={onChangeStatus}
      onUpdateTask={onUpdateTask}
      onSnoozeFollowUp={onSnoozeFollowUp}
      onRemoveDependency={onRemoveDependency}
      onDelete={onDelete}
    />
  );
}

export function TaskBoard({ columns, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask, onCreateTaskForStatus, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: TaskBoardProps) {
  const [selectedMobileStatus, setSelectedMobileStatus] = useState<TaskStatus>(() => columns[0]?.status ?? 'BACKLOG');
  const [isMobileBoard, setIsMobileBoard] = useState(isMobileBoardViewport);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const columnsByStatus = useMemo(() => new Map(columns.map((column) => [column.status, column])), [columns]);
  const desktopStatuses = useMemo(() => columns.map(({ status }) => status), [columns]);
  const mobileStatuses = desktopStatuses;
  const activeMobileStatus = mobileStatuses.includes(selectedMobileStatus) ? selectedMobileStatus : mobileStatuses[0] ?? selectedMobileStatus;
  const mobileColumn = columnsByStatus.get(activeMobileStatus) ?? { status: activeMobileStatus, tasks: [] };
  const mobileStatusIndex = mobileStatuses.indexOf(activeMobileStatus);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BOARD_QUERY);
    const handleViewportChange = () => setIsMobileBoard(mediaQuery.matches);

    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  const focusStatusTab = (status: TaskStatus) => {
    setSelectedMobileStatus(status);
    window.requestAnimationFrame(() => tabRefs.current[mobileStatuses.indexOf(status)]?.focus());
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, status: TaskStatus) => {
    const currentIndex = mobileStatuses.indexOf(status);
    if (currentIndex === -1 || mobileStatuses.length === 0) return;

    let nextIndex: number;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % mobileStatuses.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + mobileStatuses.length) % mobileStatuses.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = mobileStatuses.length - 1;
    else return;

    event.preventDefault();
    focusStatusTab(mobileStatuses[nextIndex]);
  };

  const columnProps = {
    busy,
    draggingTaskId,
    dropTarget,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onClearDropTarget,
    onMoveTaskTo,
    onStartSubtask,
    onCreateTaskForStatus,
    onComplete,
    onChangeStatus,
    onUpdateTask,
    onSnoozeFollowUp,
    onRemoveDependency,
    onDelete,
  };
  const renderedColumns = isMobileBoard ? [mobileColumn] : columns;
  const renderedStatuses = isMobileBoard ? mobileStatuses : desktopStatuses;
  const boardAriaProps = isMobileBoard
    ? {
      id: `task-board-status-panel-${activeMobileStatus}`,
      role: 'tabpanel',
      'aria-labelledby': `task-board-status-tab-${activeMobileStatus}`,
      'aria-label': 'Selected task status column',
    }
    : { 'aria-label': 'Task status board' };

  return (
    <>
      <div className={styles.statusTabs} role="tablist" aria-label="Select task status column">
        {mobileStatuses.map((status, index) => {
          const isSelected = activeMobileStatus === status;
          const count = columnsByStatus.get(status)?.tasks.length ?? 0;

          return (
            <button
              key={status}
              ref={(node) => { tabRefs.current[index] = node; }}
              id={`task-board-status-tab-${status}`}
              className={[styles.statusTab, isSelected ? styles.statusTabSelected : ''].filter(Boolean).join(' ')}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`task-board-status-panel-${status}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedMobileStatus(status)}
              onKeyDown={(event) => handleTabKeyDown(event, status)}
            >
              <span className={styles.statusTabLabel}>{status}</span>
              <span className={styles.statusTabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.board} {...boardAriaProps}>
        {renderedColumns.map((column, columnIndex) => (
          <BoardColumnRenderer
            key={column.status}
            column={column}
            statusIndex={isMobileBoard ? mobileStatusIndex : columnIndex}
            statuses={renderedStatuses}
            {...columnProps}
          />
        ))}
      </div>
    </>
  );
}
