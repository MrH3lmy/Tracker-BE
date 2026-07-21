package com.taskpriority.repository;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserId(Long userId);

    Optional<Task> findByUserIdAndId(Long userId, Long id);

    boolean existsByUserIdAndId(Long userId, Long id);

    List<Task> findByUserIdAndStatus(Long userId, Status status);
    List<Task> findByUserIdAndProjectId(Long userId, Long projectId);

    @Query("select t from Task t where t.userId = :userId and t.dueDate <= :date and t.status <> :status")
    List<Task> findOverdueTasks(Long userId, LocalDate date, Status status);

    List<Task> findByUserIdAndDueDate(Long userId, LocalDate date);

    List<Task> findByUserIdAndFollowUpDate(Long userId, LocalDate date);

    List<Task> findByUserIdAndDueDateBetween(Long userId, LocalDate start, LocalDate end);

    List<Task> findByUserIdAndBoardColumnIdOrderByPositionAscIdAsc(Long userId, Long boardColumnId);

    List<Task> findByUserIdAndStatusOrderByPositionAscIdAsc(Long userId, Status status);

    List<Task> findByUserIdAndParentTaskIdOrderByPositionAscIdAsc(Long userId, Long parentTaskId);

    List<Task> findByUserIdAndParentTaskIdInOrderByPositionAscIdAsc(Long userId, Collection<Long> parentTaskIds);

    List<Task> findByUserIdAndParentTaskIdIsNullOrderByPositionAscIdAsc(Long userId);

    long countByUserIdAndParentTaskId(Long userId, Long parentTaskId);

    long countByUserIdAndParentTaskIdAndStatus(Long userId, Long parentTaskId, Status status);

    boolean existsByUserIdAndParentTaskIdAndStatusNotIn(Long userId, Long parentTaskId, List<Status> statuses);
}
