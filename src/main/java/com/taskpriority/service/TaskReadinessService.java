package com.taskpriority.service;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskBlockerSummary;
import com.taskpriority.repository.TaskDependencyOpenBlockerRow;
import com.taskpriority.repository.TaskDependencyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Issue #282's single authoritative definition of task dependency readiness: whether a task is
 * blocked, whether it's ready, and (when blocked) which unfinished required prerequisites are
 * holding it up. Every consumer - Today (#286/#289), task detail/list responses, and future
 * project board / Project Command Center views - goes through this service rather than
 * recomputing the rule itself.
 *
 * <p><b>Rules:</b>
 * <ul>
 *   <li>A task whose own status is DONE or CANCELLED is neither blocked nor ready - it's already
 *       off the table, so "no incomplete prerequisites" must never be read as "ready to work on"
 *       for a task that's already finished or abandoned.</li>
 *   <li>Otherwise, {@code blocked} is true iff the task has at least one {@code BLOCKS}-type
 *       dependency whose prerequisite task is not DONE/CANCELLED. {@code RELATED}-type
 *       dependencies are informational only and never block readiness.</li>
 *   <li>{@code ready} is the negation of {@code blocked} for an otherwise-actionable task -
 *       exactly one of {@code blocked}/{@code ready} is true for a non-closed task, and both are
 *       false for a closed one.</li>
 * </ul>
 */
@Service
public class TaskReadinessService {
    public static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);

    private static final Readiness NOT_ACTIONABLE = new Readiness(false, false, List.of());
    private static final Readiness READY = new Readiness(false, true, List.of());

    private final TaskDependencyRepository taskDependencyRepository;

    public TaskReadinessService(TaskDependencyRepository taskDependencyRepository) {
        this.taskDependencyRepository = taskDependencyRepository;
    }

    public record Readiness(boolean blocked, boolean ready, List<TaskBlockerSummary> blockers) {
    }

    @Transactional(readOnly = true)
    public Readiness computeForTask(Long userId, Task task) {
        return computeBatch(userId, List.of(task)).getOrDefault(task.getId(), NOT_ACTIONABLE);
    }

    /** One dependency query for the whole batch - never one lookup per task. */
    @Transactional(readOnly = true)
    public Map<Long, Readiness> computeBatch(Long userId, Collection<Task> tasks) {
        List<Long> actionableIds = tasks.stream()
                .filter(t -> t.getId() != null && !CLOSED_STATUSES.contains(t.getStatus()))
                .map(Task::getId)
                .toList();

        Map<Long, List<TaskDependencyOpenBlockerRow>> blockersByTask = actionableIds.isEmpty()
                ? Map.of()
                : taskDependencyRepository.findOpenBlockers(userId, actionableIds, CLOSED_STATUSES).stream()
                        .collect(Collectors.groupingBy(TaskDependencyOpenBlockerRow::taskId));

        Map<Long, Readiness> result = new HashMap<>();
        for (Task task : tasks) {
            if (task.getId() == null) {
                continue;
            }
            if (CLOSED_STATUSES.contains(task.getStatus())) {
                result.put(task.getId(), NOT_ACTIONABLE);
                continue;
            }
            List<TaskDependencyOpenBlockerRow> rows = blockersByTask.get(task.getId());
            if (rows == null || rows.isEmpty()) {
                result.put(task.getId(), READY);
            } else {
                List<TaskBlockerSummary> blockers = rows.stream()
                        .map(row -> new TaskBlockerSummary(row.blockerId(), row.blockerTitle(), row.blockerStatus()))
                        .toList();
                result.put(task.getId(), new Readiness(true, false, blockers));
            }
        }
        return result;
    }
}
