package com.taskpriority.repository;

import com.taskpriority.model.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
