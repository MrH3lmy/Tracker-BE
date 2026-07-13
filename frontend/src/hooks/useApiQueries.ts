import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFormData, apiJson, apiText, type ApiCallResult } from '../apiClient';
import type { NoteAiGenerationRecord, NoteAttachmentRecord, NoteBlockRecord, NoteCollectionRecord, NoteContentType, NoteRecord, NoteTemplateRecord, NoteVersionRecord } from '../components/notes/noteTypes';
import type { TaskDetailRecord, TaskRecord } from '../components/tasks/taskTypes';
import type { BoardColumnRecord } from '../components/board/boardTypes';
import { isTaskStatus } from '../validation/taskStatus';

export type TaskTab = 'active' | 'archive' | 'duplicates';

export interface NotesQueryFilters {
  q?: string;
  contentType?: NoteContentType | 'all';
  taskId?: number | string;
  tags?: string | string[];
  collectionId?: number | string;
  sortBy?: 'createdAt' | 'updatedAt' | 'displayOrder' | 'title' | 'task' | 'contentType';
  hasAttachments?: boolean | '';
  linkedTask?: boolean | '';
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  untagged?: boolean | '';
  tagMode?: 'any' | 'all';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

type MoveTaskVariables = { id: number; body: { status?: string; boardColumnId?: number; position?: number } };
export type UploadScreenshotVariables = { noteId: number; file: File | Blob; caption?: string; source?: string; width?: number; height?: number };
type MoveTaskContext = { previousActive?: ApiCallResult<unknown> };

export const queryKeys = {
  tasks: (tab: TaskTab) => ['tasks', tab] as const,
  taskBlockers: ['tasks', 'blockers'] as const,
  noteBlocks: (noteId: number) => ['notes', noteId, 'blocks'] as const,
  noteTemplates: ['note-templates'] as const,
  noteCollections: ['note-collections'] as const,
  noteSavedViews: ['note-saved-views'] as const,
  noteAiGenerations: (noteId: number) => ['notes', noteId, 'ai-generations'] as const,
  noteVersions: (noteId: number) => ['notes', noteId, 'versions'] as const,
  notes: (filters?: NotesQueryFilters) => ['notes', filters?.q ?? '', filters?.contentType ?? 'all', filters?.taskId ?? '', Array.isArray(filters?.tags) ? filters.tags.join(',') : filters?.tags ?? '', filters?.collectionId ?? '', filters?.hasAttachments ?? '', filters?.linkedTask ?? '', filters?.createdFrom ?? '', filters?.createdTo ?? '', filters?.updatedFrom ?? '', filters?.updatedTo ?? '', filters?.untagged ?? '', filters?.tagMode ?? 'any', filters?.sortBy ?? 'updatedAt', filters?.sortDirection ?? 'desc', filters?.page ?? '', filters?.size ?? ''] as const,
  planningToday: ['planning', 'today'] as const,
  planningWeekly: ['planning', 'weekly'] as const,
  planningRecommendations: ['planning', 'recommendations'] as const,
  planningProjectBoard: ['planning', 'project-board'] as const,
  matrix: ['matrix'] as const,
  calendarMonth: (year: string, month: string) => ['calendar', 'month', year, month] as const,
  settings: ['settings'] as const,
  boardColumns: ['board-columns'] as const,
  taskDetail: (id: number) => ['tasks', id, 'detail'] as const,
};

const taskPathByTab: Record<TaskTab, string> = { active: '/api/v1/tasks', archive: '/api/v1/tasks/archive', duplicates: '/api/v1/tasks/duplicates' };

export const useTasksQuery = (tab: TaskTab) => useQuery({ queryKey: queryKeys.tasks(tab), queryFn: () => apiJson<TaskRecord[]>('GET', taskPathByTab[tab]) });
export const useTaskBlockersQuery = () => useQuery({ queryKey: queryKeys.taskBlockers, queryFn: () => apiJson<unknown>('GET', '/api/v1/tasks/blockers') });
export const useBoardColumnsQuery = () => useQuery({ queryKey: queryKeys.boardColumns, queryFn: () => apiJson<BoardColumnRecord[]>('GET', '/api/v1/board-columns') });
export const useTaskDetailQuery = (id: number, enabled = true) => useQuery({ queryKey: queryKeys.taskDetail(id), queryFn: () => apiJson<TaskDetailRecord>('GET', `/api/v1/tasks/${id}/detail`), enabled });
export const useNotesQuery = (filters: NotesQueryFilters = {}) => useQuery({
  queryKey: queryKeys.notes(filters),
  queryFn: () => {
    const params = new URLSearchParams();
    const q = filters.q?.trim();
    if (q) params.set('q', q);
    if (filters.contentType && filters.contentType !== 'all') params.set('contentType', filters.contentType);
    if (filters.taskId !== undefined && String(filters.taskId).trim() !== '') params.set('taskId', String(filters.taskId).trim());
    if (filters.collectionId !== undefined && String(filters.collectionId).trim() !== '') params.set('collectionId', String(filters.collectionId).trim());
    const tags = Array.isArray(filters.tags) ? filters.tags : filters.tags?.split(',') ?? [];
    tags.map((tag) => tag.trim()).filter(Boolean).forEach((tag) => params.append('tag', tag));
    if (filters.hasAttachments !== undefined && filters.hasAttachments !== '') params.set('hasAttachments', String(filters.hasAttachments));
    if (filters.linkedTask !== undefined && filters.linkedTask !== '') params.set('linkedTask', String(filters.linkedTask));
    if (filters.createdFrom?.trim()) params.set('createdFrom', filters.createdFrom.trim());
    if (filters.createdTo?.trim()) params.set('createdTo', filters.createdTo.trim());
    if (filters.updatedFrom?.trim()) params.set('updatedFrom', filters.updatedFrom.trim());
    if (filters.updatedTo?.trim()) params.set('updatedTo', filters.updatedTo.trim());
    if (filters.untagged !== undefined && filters.untagged !== '') params.set('untagged', String(filters.untagged));
    if (filters.tagMode) params.set('tagMode', filters.tagMode);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortDirection) params.set('sortDirection', filters.sortDirection);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.size !== undefined) params.set('size', String(filters.size));
    const query = params.toString();
    return apiJson<NoteRecord[]>('GET', `/api/v1/notes${query ? `?${query}` : ''}`);
  },
});
export const useNoteTemplatesQuery = () => useQuery({ queryKey: queryKeys.noteTemplates, queryFn: () => apiJson<NoteTemplateRecord[]>('GET', '/api/v1/note-templates') });
export const useNoteCollectionsQuery = () => useQuery({ queryKey: queryKeys.noteCollections, queryFn: () => apiJson<NoteCollectionRecord[]>('GET', '/api/v1/note-collections') });
export interface NoteSavedViewRecord { id: number; name: string; filters: Record<string, unknown>; sortField: string; sortDirection: 'asc' | 'desc'; viewType: string; createdAt?: string; updatedAt?: string; }
export const useNoteSavedViewsQuery = () => useQuery({ queryKey: queryKeys.noteSavedViews, queryFn: () => apiJson<NoteSavedViewRecord[]>('GET', '/api/v1/note-saved-views') });
export const useNoteVersionsQuery = (noteId: number, enabled = true) => useQuery({ queryKey: queryKeys.noteVersions(noteId), queryFn: () => apiJson<NoteVersionRecord[]>('GET', `/api/v1/notes/${noteId}/versions`), enabled });
export const useNoteAiGenerationsQuery = (noteId: number, enabled = true) => useQuery({ queryKey: queryKeys.noteAiGenerations(noteId), queryFn: () => apiJson<NoteAiGenerationRecord[]>('GET', `/api/v1/notes/${noteId}/ai-generations`), enabled });
export const useNoteBlocksQuery = (noteId: number, enabled = true) => useQuery({ queryKey: queryKeys.noteBlocks(noteId), queryFn: () => apiJson<NoteBlockRecord[]>('GET', `/api/v1/notes/${noteId}/blocks`), enabled });
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
  const onSuccess = () => { qc.invalidateQueries({ queryKey: ['notes'] }); qc.invalidateQueries({ queryKey: queryKeys.noteCollections }); };
  return {
    createNote: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/notes', body), onSuccess }),
    createNoteFromTemplate: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/notes/from-template', body), onSuccess }),
    updateNote: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PUT', `/api/v1/notes/${id}`, body), onSuccess }),
    deleteNote: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/notes/${id}`), onSuccess }),
    createBlock: useMutation({ mutationFn: ({ noteId, body }: { noteId: number; body: unknown }) => apiJson<NoteBlockRecord>('POST', `/api/v1/notes/${noteId}/blocks`, body), onSuccess }),
    updateBlock: useMutation({ mutationFn: ({ noteId, blockId, body }: { noteId: number; blockId: number; body: unknown }) => apiJson<NoteBlockRecord>('PATCH', `/api/v1/notes/${noteId}/blocks/${blockId}`, body), onSuccess }),
    deleteBlock: useMutation({ mutationFn: ({ noteId, blockId }: { noteId: number; blockId: number }) => apiJson('DELETE', `/api/v1/notes/${noteId}/blocks/${blockId}`), onSuccess }),
    reorderBlocks: useMutation({ mutationFn: ({ noteId, blockIds }: { noteId: number; blockIds: number[] }) => apiJson<NoteBlockRecord[]>('PATCH', `/api/v1/notes/${noteId}/blocks/reorder`, { blockIds }), onSuccess }),
    convertNoteToTask: useMutation({ mutationFn: ({ noteId, blockId, body }: { noteId: number; blockId?: number; body: unknown }) => apiJson('POST', blockId ? `/api/v1/notes/${noteId}/blocks/${blockId}/convert-to-task` : `/api/v1/notes/${noteId}/convert-selection-to-task`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); qc.invalidateQueries({ queryKey: ['tasks'] }); } }),
    createTaskLink: useMutation({ mutationFn: ({ noteId, body }: { noteId: number; body: unknown }) => apiJson('POST', `/api/v1/notes/${noteId}/task-links`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); qc.invalidateQueries({ queryKey: ['tasks'] }); } }),
    deleteTaskLink: useMutation({ mutationFn: ({ noteId, linkId }: { noteId: number; linkId: number }) => apiJson('DELETE', `/api/v1/notes/${noteId}/task-links/${linkId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); qc.invalidateQueries({ queryKey: ['tasks'] }); } }),
    restoreNoteVersion: useMutation({ mutationFn: ({ noteId, versionId }: { noteId: number; versionId: number }) => apiJson<NoteRecord>('POST', `/api/v1/notes/${noteId}/versions/${versionId}/restore`), onSuccess: (_data, variables) => { qc.invalidateQueries({ queryKey: ['notes'] }); qc.invalidateQueries({ queryKey: queryKeys.noteVersions(variables.noteId) }); } }),
    runNoteAiAction: useMutation({ mutationFn: ({ noteId, action }: { noteId: number; action: string }) => apiJson<NoteAiGenerationRecord>('POST', `/api/v1/notes/${noteId}/ai-actions`, { action }), onSuccess: (_data, variables) => { qc.invalidateQueries({ queryKey: queryKeys.noteAiGenerations(variables.noteId) }); qc.invalidateQueries({ queryKey: ['notes'] }); } }),
    createCollection: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/note-collections', body), onSuccess }),
    updateCollection: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PATCH', `/api/v1/note-collections/${id}`, body), onSuccess }),
    deleteCollection: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/note-collections/${id}`), onSuccess }),
    createSavedView: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/note-saved-views', body), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.noteSavedViews }) }),
    updateSavedView: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PUT', `/api/v1/note-saved-views/${id}`, body), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.noteSavedViews }) }),
    deleteSavedView: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/note-saved-views/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.noteSavedViews }) }),
    uploadScreenshot: useMutation({
      mutationFn: ({ noteId, file, caption, source, width, height }: UploadScreenshotVariables) => {
        const formData = new FormData();
        formData.append('file', file instanceof File ? file : new File([file], 'screenshot.png', { type: file.type || 'image/png' }));
        if (caption !== undefined) formData.append('caption', caption);
        if (source !== undefined) formData.append('source', source);
        if (width !== undefined) formData.append('width', String(width));
        if (height !== undefined) formData.append('height', String(height));
        return apiFormData<NoteAttachmentRecord>('POST', `/api/v1/notes/${noteId}/tools/screenshot`, formData);
      },
      onSuccess,
    }),
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
