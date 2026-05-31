package com.taskpriority.repository;

import com.taskpriority.model.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, Long> {
    List<TaskDependency> findByTaskId(Long taskId);
    List<TaskDependency> findByBlocksTaskId(Long blocksTaskId);
    boolean existsByTaskIdAndBlocksTaskId(Long taskId, Long blocksTaskId);
    void deleteByTaskIdAndBlocksTaskId(Long taskId, Long blocksTaskId);
}
