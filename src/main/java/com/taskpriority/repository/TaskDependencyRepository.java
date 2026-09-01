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
     * Ids (within {@code taskIds}) that currently have at least one dependency whose blocking task
     * isn't closed yet - i.e. genuinely blocked, not just carrying the manual {@code Status.BLOCKED}
     * label. One query for the whole batch (issue #286's Today view), not one EXISTS check per task.
     */
    @Query("select distinct d.task.id from TaskDependency d where d.userId = :userId and d.task.id in :taskIds " +
            "and d.blocksTask.status not in :closedStatuses")
    List<Long> findTaskIdsWithOpenBlockers(@Param("userId") Long userId, @Param("taskIds") Collection<Long> taskIds,
                                            @Param("closedStatuses") Collection<Status> closedStatuses);
}
