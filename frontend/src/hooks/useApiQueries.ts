import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiText, type ApiCallResult } from '../apiClient';
import type { NoteContentType, NoteRecord } from '../components/notes/noteTypes';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { isTaskStatus } from '../validation/taskStatus';

export type TaskTab = 'active' | 'archive' | 'duplicates';

export interface NotesQueryFilters {
  q?: string;
  contentType?: NoteContentType | 'all';
  taskId?: number | string;
  tags?: string | string[];
}

type MoveTaskVariables = { id: number; body: { status?: string; boardColumnId?: number; position?: number } };
type MoveTaskContext = { previousActive?: ApiCallResult<unknown> };

export const queryKeys = {
  tasks: (tab: TaskTab) => ['tasks', tab] as const,
  taskBlockers: ['tasks', 'blockers'] as const,
  notes: (filters?: NotesQueryFilters) => ['notes', filters?.q ?? '', filters?.contentType ?? 'all', filters?.taskId ?? '', Array.isArray(filters?.tags) ? filters.tags.join(',') : filters?.tags ?? ''] as const,
  planningToday: ['planning', 'today'] as const,
  planningWeekly: ['planning', 'weekly'] as const,
  planningRecommendations: ['planning', 'recommendations'] as const,
  planningProjectBoard: ['planning', 'project-board'] as const,
  matrix: ['matrix'] as const,
  calendarMonth: (year: string, month: string) => ['calendar', 'month', year, month] as const,
  settings: ['settings'] as const,
};

const taskPathByTab: Record<TaskTab, string> = { active: '/api/v1/tasks', archive: '/api/v1/tasks/archive', duplicates: '/api/v1/tasks/duplicates' };

export const useTasksQuery = (tab: TaskTab) => useQuery({ queryKey: queryKeys.tasks(tab), queryFn: () => apiJson<TaskRecord[]>('GET', taskPathByTab[tab]) });
export const useTaskBlockersQuery = () => useQuery({ queryKey: queryKeys.taskBlockers, queryFn: () => apiJson<unknown>('GET', '/api/v1/tasks/blockers') });
export const useNotesQuery = (filters: NotesQueryFilters = {}) => useQuery({
  queryKey: queryKeys.notes(filters),
  queryFn: () => {
    const params = new URLSearchParams();
    const q = filters.q?.trim();
    if (q) params.set('q', q);
    if (filters.contentType && filters.contentType !== 'all') params.set('contentType', filters.contentType);
    if (filters.taskId !== undefined && String(filters.taskId).trim() !== '') params.set('taskId', String(filters.taskId).trim());
    const tags = Array.isArray(filters.tags) ? filters.tags : filters.tags?.split(',') ?? [];
    tags.map((tag) => tag.trim()).filter(Boolean).forEach((tag) => params.append('tag', tag));
    const query = params.toString();
    return apiJson<NoteRecord[]>('GET', `/api/v1/notes${query ? `?${query}` : ''}`);
  },
});
export const usePlanningTodayQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningToday, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/today'), enabled });
export const usePlanningWeeklyQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningWeekly, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/weekly'), enabled });
export const usePlanningRecommendationsQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningRecommendations, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/recommendations'), enabled });
export const usePlanningProjectBoardQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningProjectBoard, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/project-board'), enabled });
export const useMatrixQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.matrix, queryFn: () => apiJson<unknown>('GET', '/api/v1/matrix'), enabled });
export const useCalendarMonthQuery = (year: string, month: string, enabled: boolean) => useQuery({ queryKey: queryKeys.calendarMonth(year, month), queryFn: () => apiJson<unknown>('GET', `/api/v1/calendar/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`), enabled });
export const useSettingsQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.settings, queryFn: () => apiJson<unknown>('GET', '/api/v1/settings'), enabled });

const invalidateTaskFamily = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['tasks'] });
  qc.invalidateQueries({ queryKey: ['planning'] });
  qc.invalidateQueries({ queryKey: ['matrix'] });
};

const sortTasksForPositioning = (tasks: TaskRecord[]) => [...tasks].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

const applyOptimisticTaskMove = (cached: ApiCallResult<unknown> | undefined, { id, body }: MoveTaskVariables) => {
  if (!cached || !Array.isArray(cached.data)) return cached;
  const tasks = cached.data as TaskRecord[];
  const movingTask = tasks.find((task) => task.id === id);
  if (!movingTask) return cached;

  const targetStatus = body.status && isTaskStatus(body.status) ? body.status : movingTask.status;
  if (!targetStatus) return cached;

  const sourceStatus = movingTask.status;
  const remainingTasks = tasks.filter((task) => task.id !== id);
  const targetTasks = sortTasksForPositioning(remainingTasks.filter((task) => task.status === targetStatus));
  const targetPosition = Math.max(0, Math.min(body.position ?? targetTasks.length, targetTasks.length));
  const movedTask: TaskRecord = {
    ...movingTask,
    status: targetStatus,
    boardColumnId: body.boardColumnId ?? movingTask.boardColumnId,
  };
  const targetOrder = [...targetTasks.slice(0, targetPosition), movedTask, ...targetTasks.slice(targetPosition)];
  const positionById = new Map<number, number>();

  targetOrder.forEach((task, index) => positionById.set(task.id, index));
  if (sourceStatus && sourceStatus !== targetStatus) {
    sortTasksForPositioning(remainingTasks.filter((task) => task.status === sourceStatus)).forEach((task, index) => positionById.set(task.id, index));
  }

  return {
    ...cached,
    data: tasks.map((task) => {
      const updatedTask = task.id === id ? movedTask : task;
      const optimisticPosition = positionById.get(updatedTask.id);
      return optimisticPosition === undefined ? updatedTask : { ...updatedTask, position: optimisticPosition };
    }),
  } satisfies ApiCallResult<unknown>;
};

export function useTaskMutations() {
  const qc = useQueryClient();
  const onSuccess = () => invalidateTaskFamily(qc);
  return {
    createTask: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/tasks', body), onSuccess }),
    updateTask: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PUT', `/api/v1/tasks/${id}`, body), onSuccess }),
    deleteTask: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/tasks/${id}`), onSuccess }),
    completeTask: useMutation({ mutationFn: (id: number) => apiJson('PATCH', `/api/v1/tasks/${id}/complete`), onSuccess }),
    changeStatus: useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => apiJson('PATCH', `/api/v1/tasks/${id}/status?status=${encodeURIComponent(status)}`), onSuccess }),
    moveTask: useMutation<ApiCallResult<unknown>, Error, MoveTaskVariables, MoveTaskContext>({
      mutationFn: ({ id, body }) => apiJson('PATCH', `/api/v1/tasks/${id}/move`, body),
      onMutate: async (variables) => {
        await qc.cancelQueries({ queryKey: queryKeys.tasks('active') });
        const previousActive = qc.getQueryData<ApiCallResult<unknown>>(queryKeys.tasks('active'));
        qc.setQueryData<ApiCallResult<unknown> | undefined>(queryKeys.tasks('active'), (cached) => applyOptimisticTaskMove(cached, variables));
        return { previousActive };
      },
      onError: (_error, _variables, context) => {
        if (context?.previousActive) qc.setQueryData(queryKeys.tasks('active'), context.previousActive);
      },
      onSettled: () => invalidateTaskFamily(qc),
    }),
    addDependency: useMutation({ mutationFn: ({ id, blocksTaskId }: { id: number; blocksTaskId: number }) => apiJson('POST', `/api/v1/tasks/${id}/dependencies`, { blocksTaskId }), onSuccess }),
    removeDependency: useMutation({ mutationFn: ({ id, blocksTaskId }: { id: number; blocksTaskId: number }) => apiJson('DELETE', `/api/v1/tasks/${id}/dependencies/${blocksTaskId}`), onSuccess }),
  };
}
export function useNoteMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['notes'] });
  return {
    createNote: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/notes', body), onSuccess }),
    updateNote: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PUT', `/api/v1/notes/${id}`, body), onSuccess }),
    deleteNote: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/notes/${id}`), onSuccess }),
  };
}

export function useImportMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['tasks'] });
  return {
    importCsv: useMutation({ mutationFn: (payload: string) => apiText('POST', '/api/v1/import/csv', payload, 'text/plain'), onSuccess }),
    importTasks: useMutation({ mutationFn: (payload: unknown) => apiJson('POST', '/api/v1/import/tasks', payload), onSuccess }),
  };
}
export const useSaveSettingsMutation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (payload: unknown) => apiJson('PUT', '/api/v1/settings', payload), onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.settings }); qc.invalidateQueries({ queryKey: ['matrix'] }); qc.invalidateQueries({ queryKey: ['planning'] }); } });
};

export const latestResult = (...results: Array<ApiCallResult<unknown> | null | undefined>) => results.find((result) => result != null) ?? null;
