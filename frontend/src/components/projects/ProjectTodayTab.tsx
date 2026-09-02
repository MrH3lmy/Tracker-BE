import { isQueryError } from '../../apiClient';
import { useProjectTodayQuery } from '../../hooks/useApiQueries';
import { TodaySections } from '../tasks/TodaySections';

/**
 * Project-scoped Today (issue #296) - same readiness/reason semantics as the global Today page,
 * via the shared TodaySections component. Never re-implements the grouping logic.
 */
export function ProjectTodayTab({ projectId }: { projectId: number }) {
  const query = useProjectTodayQuery(projectId);

  return (
    <TodaySections
      data={query.data?.data ?? undefined}
      isLoading={query.isLoading}
      isError={isQueryError(query.data)}
      onRetry={() => query.refetch()}
      isRetrying={query.isFetching}
      emptyTitle="Nothing due today"
      emptyDescription="No tasks in this project are overdue, due, or scheduled for today."
    />
  );
}
