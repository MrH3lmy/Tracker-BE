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
 * blocked by unfinished required prerequisites, whether it is ready to work, and which prerequisite
 * tasks are causing the block. Every consumer - Today (#286/#289), task detail/list responses, and
 * future project board / Project Command Center views - goes through this service rather than
 * recomputing the rule itself.
 *
 * <p><b>Rules:</b>
 * <ul>
 *   <li>DONE/CANCELLED tasks are closed: neither blocked nor ready.</li>
 *   <li>For any other status, {@code blocked} is true iff at least one {@code BLOCKS}-type
 *       prerequisite is unfinished. {@code RELATED} dependencies are informational only.</li>
 *   <li>{@code ready} additionally requires an actionable workflow status. Tracker currently treats
 *       NOT_STARTED and IN_PROGRESS as actionable. BACKLOG, WAITING and the manual BLOCKED status
 *       are not ready even when no prerequisite is open.</li>
 * </ul>
 *
 * <p>The distinction matters: for example a WAITING task can still expose dependency blockers, but
 * it cannot become {@code ready=true} merely because those blockers are completed.</p>
 */
@Service
public class TaskReadinessService {
    public static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);
    public static final Set<Status> ACTIONABLE_STATUSES = Set.of(Status.NOT_STARTED, Status.IN_PROGRESS);

    private static final Readiness NOT_ACTIONABLE = new Readiness(false, false, List.of());

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
        List<Long> openTaskIds = tasks.stream()
                .filter(t -> t.getId() != null && !CLOSED_STATUSES.contains(t.getStatus()))
                .map(Task::getId)
                .toList();

        Map<Long, List<TaskDependencyOpenBlockerRow>> blockersByTask = openTaskIds.isEmpty()
                ? Map.of()
                : taskDependencyRepository.findOpenBlockers(userId, openTaskIds, CLOSED_STATUSES).stream()
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

            List<TaskBlockerSummary> blockers = blockersByTask.getOrDefault(task.getId(), List.of()).stream()
                    .map(row -> new TaskBlockerSummary(row.blockerId(), row.blockerTitle(), row.blockerStatus()))
                    .toList();
            boolean blocked = !blockers.isEmpty();
            boolean ready = ACTIONABLE_STATUSES.contains(task.getStatus()) && !blocked;
            result.put(task.getId(), new Readiness(blocked, ready, blockers));
        }
        return result;
    }
}
