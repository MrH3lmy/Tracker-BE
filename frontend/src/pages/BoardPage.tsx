import { useMemo } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { BoardColumn } from '../components/board/BoardColumn';
import type { BoardColumnRecord } from '../components/board/boardTypes';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { sortTasksForBoard } from '../components/tasks/taskUtils';
import { useBoardColumnsQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { PageHeader } from '../components/ui';

export function BoardPage() {
  const columnsQuery = useBoardColumnsQuery();
  const tasksQuery = useTasksQuery('active');
  const { moveTask } = useTaskMutations();

  const columns = useMemo<BoardColumnRecord[]>(() => {
    const data = columnsQuery.data?.data;
    return Array.isArray(data) ? (data as BoardColumnRecord[]) : [];
  }, [columnsQuery.data]);

  const tasks = useMemo<TaskRecord[]>(() => {
    const data = tasksQuery.data?.data;
    return Array.isArray(data) ? (data as TaskRecord[]) : [];
  }, [tasksQuery.data]);

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

    moveTask.mutate({ id: draggedTaskId, body: { boardColumnId: targetColumnId, position: targetIndex } });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Board"
        description="Drag tasks across columns to work on several at once."
        className="mb-0"
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
