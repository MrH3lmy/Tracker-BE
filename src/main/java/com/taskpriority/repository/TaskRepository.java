package com.taskpriority.repository;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    List<Task> findByUserId(Long userId);

    Optional<Task> findByUserIdAndId(Long userId, Long id);

    boolean existsByUserIdAndId(Long userId, Long id);

    long deleteByUserIdAndId(Long userId, Long id);

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

    /**
     * The three "Today" buckets (issue #286) are built as separate, mutually-exclusive DB queries
     * rather than one query filtered in Java, so each stays index-friendly and the caller never
     * has to de-duplicate a task that could otherwise match more than one bucket. {@code projectId}
     * null means "any project" (global Today); non-null scopes to one project, reusing the same
     * idx_tasks_user_id_project_id index as the rest of the project-scoped task queries.
     */
    @Query("select t from Task t where t.userId = :userId and (:projectId is null or t.projectId = :projectId) " +
            "and t.status not in :closedStatuses and t.dueDate < :today")
    List<Task> findOverdueForToday(@Param("userId") Long userId, @Param("projectId") Long projectId,
                                    @Param("today") LocalDate today, @Param("closedStatuses") Collection<Status> closedStatuses);

    @Query("select t from Task t where t.userId = :userId and (:projectId is null or t.projectId = :projectId) " +
            "and t.status not in :closedStatuses and t.dueDate = :today")
    List<Task> findDueTodayForToday(@Param("userId") Long userId, @Param("projectId") Long projectId,
                                     @Param("today") LocalDate today, @Param("closedStatuses") Collection<Status> closedStatuses);

    /** Not overdue/due-today by construction: dueDate is null or strictly after today. */
    @Query("select t from Task t where t.userId = :userId and (:projectId is null or t.projectId = :projectId) " +
            "and t.status not in :closedStatuses and t.startDate = :today and (t.dueDate is null or t.dueDate > :today)")
    List<Task> findScheduledForToday(@Param("userId") Long userId, @Param("projectId") Long projectId,
                                      @Param("today") LocalDate today, @Param("closedStatuses") Collection<Status> closedStatuses);
}
