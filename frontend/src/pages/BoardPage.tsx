import { useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { BoardColumn } from '../components/board/BoardColumn';
import type { BoardColumnRecord } from '../components/board/boardTypes';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { sortTasksForBoard } from '../components/tasks/taskUtils';
import { matchesFocus, type Focus } from '../components/scheduler/schedulerStyleUtils';
import { useBoardColumnsQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { PageHeader, SegmentedControl } from '../components/ui';
import { useUndoToast } from '../undoToastContext';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';

const focusOptions = [
  { value: 'all' as Focus, label: 'All' },
  { value: 'work' as Focus, label: 'Work' },
  { value: 'training' as Focus, label: 'Training & Life' },
];

export function BoardPage() {
  const columnsQuery = useBoardColumnsQuery();
  const tasksQuery = useTasksQuery('active');
  const { moveTask } = useTaskMutations();
  const { showUndo } = useUndoToast();
  const [focus, setFocus] = useState<Focus>('all');

  const columns = useMemo<BoardColumnRecord[]>(() => {
    const data = columnsQuery.data?.data;
    return Array.isArray(data) ? (data as BoardColumnRecord[]) : [];
  }, [columnsQuery.data]);

  const tasks = useMemo<TaskRecord[]>(() => {
    const data = tasksQuery.data?.data;
    const allTasks = Array.isArray(data) ? (data as TaskRecord[]) : [];
    return allTasks.filter((task) => matchesFocus(task.area, focus));
  }, [tasksQuery.data, focus]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<number, TaskRecord[]>();
    for (const column of columns) map.set(column.id, []);
    for (const task of tasks) {
      if (task.boardColumnId == null) continue;
      const bucket = map.get(task.boardColumnId);
      if (bucket) bucket.push(task);
    }
    for (const [columnId, bucket] of map) map.set(columnId, sortTasksForBoard(bucket));
    return map;
  }, [columns, tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isLoading = columnsQuery.isLoading || tasksQuery.isLoading;
  const hasError = isQueryError(columnsQuery.data) || isQueryError(tasksQuery.data);
  const hasData = columns.length > 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedTaskId = Number(active.id);
    const draggedTask = tasks.find((task) => task.id === draggedTaskId);
    if (!draggedTask) return;

    const overId = String(over.id);
    const targetColumnId = overId.startsWith('column-')
      ? Number(overId.replace('column-', ''))
      : tasks.find((task) => task.id === Number(overId))?.boardColumnId;
    if (targetColumnId == null) return;

    const columnTasks = (tasksByColumn.get(targetColumnId) ?? []).filter((task) => task.id !== draggedTaskId);
    const overTaskId = overId.startsWith('column-') ? undefined : Number(overId);
    const targetIndex = overTaskId === undefined ? columnTasks.length : Math.max(0, columnTasks.findIndex((task) => task.id === overTaskId));

    if (draggedTask.boardColumnId === targetColumnId && draggedTask.position === targetIndex) return;

    const previousColumnId = draggedTask.boardColumnId;
    const previousPosition = draggedTask.position;
    moveTask.mutate({ id: draggedTaskId, body: { boardColumnId: targetColumnId, position: targetIndex } }, {
      onSuccess: (result) => {
        if (!result.ok) return;
        showUndo(`"${draggedTask.title}" moved.`, () => moveTask.mutate({ id: draggedTaskId, body: { boardColumnId: previousColumnId, position: previousPosition } }));
      },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />
      </div>
      <PageHeader
        title="Board"
        description="Drag tasks across columns to work on several at once."
        className="mb-0"
        actions={<SegmentedControl value={focus} onValueChange={setFocus} options={focusOptions} aria-label="Focus filter" />}
      />

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !hasData}
        emptyMessage="No board columns configured."
      />

      {hasData && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} tasks={tasksByColumn.get(column.id) ?? []} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
