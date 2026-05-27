import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiText, type ApiCallResult } from '../apiClient';

export type TaskTab = 'active' | 'archive' | 'duplicates';

export const queryKeys = {
  tasks: (tab: TaskTab) => ['tasks', tab] as const,
  planningToday: ['planning', 'today'] as const,
  planningWeekly: ['planning', 'weekly'] as const,
  matrix: ['matrix'] as const,
  calendarMonth: (year: string, month: string) => ['calendar', 'month', year, month] as const,
  settings: ['settings'] as const,
};

const taskPathByTab: Record<TaskTab, string> = { active: '/api/v1/tasks', archive: '/api/v1/tasks/archive', duplicates: '/api/v1/tasks/duplicates' };

export const useTasksQuery = (tab: TaskTab) => useQuery({ queryKey: queryKeys.tasks(tab), queryFn: () => apiJson<unknown>('GET', taskPathByTab[tab]) });
export const usePlanningTodayQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningToday, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/today'), enabled });
export const usePlanningWeeklyQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.planningWeekly, queryFn: () => apiJson<unknown>('GET', '/api/v1/planning/weekly'), enabled });
export const useMatrixQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.matrix, queryFn: () => apiJson<unknown>('GET', '/api/v1/matrix'), enabled });
export const useCalendarMonthQuery = (year: string, month: string, enabled: boolean) => useQuery({ queryKey: queryKeys.calendarMonth(year, month), queryFn: () => apiJson<unknown>('GET', `/api/v1/calendar/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`), enabled });
export const useSettingsQuery = (enabled: boolean) => useQuery({ queryKey: queryKeys.settings, queryFn: () => apiJson<unknown>('GET', '/api/v1/settings'), enabled });

const invalidateTaskFamily = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['tasks'] });

export function useTaskMutations() {
  const qc = useQueryClient();
  const onSuccess = () => invalidateTaskFamily(qc);
  return {
    createTask: useMutation({ mutationFn: (body: unknown) => apiJson('POST', '/api/v1/tasks', body), onSuccess }),
    updateTask: useMutation({ mutationFn: ({ id, body }: { id: number; body: unknown }) => apiJson('PUT', `/api/v1/tasks/${id}`, body), onSuccess }),
    deleteTask: useMutation({ mutationFn: (id: number) => apiJson('DELETE', `/api/v1/tasks/${id}`), onSuccess }),
    completeTask: useMutation({ mutationFn: (id: number) => apiJson('PATCH', `/api/v1/tasks/${id}/complete`), onSuccess }),
    changeStatus: useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => apiJson('PATCH', `/api/v1/tasks/${id}/status?status=${encodeURIComponent(status)}`), onSuccess }),
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
