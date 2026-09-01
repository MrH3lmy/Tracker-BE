package com.taskpriority.repository;

import com.taskpriority.model.Status;
import com.taskpriority.model.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, Long> {
    List<TaskDependency> findByUserId(Long userId);
    List<TaskDependency> findByUserIdAndTaskId(Long userId, Long taskId);
    List<TaskDependency> findByUserIdAndBlocksTaskId(Long userId, Long blocksTaskId);
    List<TaskDependency> findByUserIdAndTaskIdIn(Long userId, Collection<Long> taskIds);
    List<TaskDependency> findByUserIdAndBlocksTaskIdIn(Long userId, Collection<Long> blocksTaskIds);
    boolean existsByUserIdAndTaskIdAndBlocksTaskId(Long userId, Long taskId, Long blocksTaskId);
    void deleteByUserIdAndTaskIdAndBlocksTaskId(Long userId, Long taskId, Long blocksTaskId);

    /**
     * Open (not DONE/CANCELLED) required ({@code BLOCKS}-type) prerequisites for every id in
     * {@code taskIds}, one query for the whole batch - this is the single source of truth for
     * "is this task blocked, and by what" (issue #282's {@code TaskReadinessService}), consumed by
     * Today, task detail/list responses, and future project board / Project Command Center views.
     * {@code RELATED}-type dependencies are informational only and never block readiness.
     */
    @Query("select new com.taskpriority.repository.TaskDependencyOpenBlockerRow(" +
            "d.task.id, d.blocksTask.id, d.blocksTask.title, d.blocksTask.status) " +
            "from TaskDependency d where d.userId = :userId and d.task.id in :taskIds " +
            "and d.dependencyType = com.taskpriority.model.TaskDependencyType.BLOCKS " +
            "and d.blocksTask.status not in :closedStatuses")
    List<TaskDependencyOpenBlockerRow> findOpenBlockers(@Param("userId") Long userId, @Param("taskIds") Collection<Long> taskIds,
                                                          @Param("closedStatuses") Collection<Status> closedStatuses);

    /**
     * True if {@code targetTaskId} is reachable from {@code startTaskId} by following required
     * {@code BLOCKS} dependency edges (task -&gt; blocks_task, i.e. "depends on"). Informational
     * {@code RELATED} edges are deliberately excluded from the prerequisite DAG. Used before
     * inserting a new BLOCKS edge: if {@code startTaskId} can already transitively reach
     * {@code targetTaskId}, the candidate edge would close a cycle. A recursive CTE over indexed
     * columns keeps this a single query regardless of graph depth.
     */
    @Query(value = "WITH RECURSIVE reachable(task_id) AS (" +
            "  SELECT blocks_task_id FROM task_dependencies " +
            "  WHERE user_id = :userId AND task_id = :startTaskId AND dependency_type = 'BLOCKS' " +
            "  UNION " +
            "  SELECT td.blocks_task_id FROM task_dependencies td JOIN reachable r ON td.task_id = r.task_id " +
            "  WHERE td.user_id = :userId AND td.dependency_type = 'BLOCKS'" +
            ") SELECT EXISTS (SELECT 1 FROM reachable WHERE task_id = :targetTaskId)", nativeQuery = true)
    boolean existsDependencyPath(@Param("userId") Long userId, @Param("startTaskId") Long startTaskId,
                                  @Param("targetTaskId") Long targetTaskId);
}
