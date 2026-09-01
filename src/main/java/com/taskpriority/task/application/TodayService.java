package com.taskpriority.task.application;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TodayReason;
import com.taskpriority.task.api.TodayResponse;
import com.taskpriority.task.api.TodayTaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Backend read model for "what should I care about today" (issue #286) - due-today, overdue, and
 * (when the task has a start date) scheduled-today tasks, scoped optionally to one project.
 */
@Service
public class TodayService {
    private static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);

    private final TaskRepository taskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final ProjectRepository projectRepository;
    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;

    public TodayService(TaskRepository taskRepository, TaskDependencyRepository taskDependencyRepository,
                         TaskService taskService, TaskApiMapper taskApiMapper, ProjectRepository projectRepository,
                         SettingsService settingsService, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.projectRepository = projectRepository;
        this.settingsService = settingsService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public TodayResponse getToday() {
        return buildToday(null);
    }

    @Transactional(readOnly = true)
    public TodayResponse getProjectToday(Long projectId) {
        Long userId = currentUserService.requireUserId();
        if (!projectRepository.existsByUserIdAndId(userId, projectId)) {
            throw new ResourceNotFoundException("Project with id " + projectId + " not found");
        }
        return buildToday(projectId);
    }

    private TodayResponse buildToday(Long projectId) {
        Long userId = currentUserService.requireUserId();
        // Per-user timezone (issue #286): LocalDate.now() with no zone would silently use the
        // JVM/server default, so "today" could roll over at the wrong instant for the caller.
        LocalDate today = LocalDate.now(settingsService.getTimezoneForUser(userId));

        List<Task> overdue = taskRepository.findOverdueForToday(userId, projectId, today, CLOSED_STATUSES);
        List<Task> dueToday = taskRepository.findDueTodayForToday(userId, projectId, today, CLOSED_STATUSES);
        List<Task> scheduledToday = taskRepository.findScheduledForToday(userId, projectId, today, CLOSED_STATUSES);

        List<Task> all = new ArrayList<>(overdue.size() + dueToday.size() + scheduledToday.size());
        all.addAll(overdue);
        all.addAll(dueToday);
        all.addAll(scheduledToday);
        taskService.computeDerivedFieldsBatch(all);

        List<Long> allIds = all.stream().map(Task::getId).toList();
        Set<Long> blockedIds = allIds.isEmpty()
                ? Set.of()
                : new HashSet<>(taskDependencyRepository.findTaskIdsWithOpenBlockers(userId, allIds, CLOSED_STATUSES));

        List<TodayTaskResponse> tasks = new ArrayList<>();
        tasks.addAll(toResponses(overdue, TodayReason.OVERDUE, blockedIds));
        tasks.addAll(toResponses(dueToday, TodayReason.DUE_TODAY, blockedIds));
        tasks.addAll(toResponses(scheduledToday, TodayReason.SCHEDULED_TODAY, blockedIds));

        return new TodayResponse(today, tasks);
    }

    /** Deterministic within each Today bucket: priority score desc, due date asc (nulls last), id asc. */
    private List<TodayTaskResponse> toResponses(List<Task> tasks, TodayReason reason, Set<Long> blockedIds) {
        Comparator<Task> order = Comparator
                .comparingInt((Task t) -> -t.getPriorityScore())
                .thenComparing((Task t) -> t.getDueDate() == null ? LocalDate.MAX : t.getDueDate())
                .thenComparing(Task::getId);
        return tasks.stream()
                .sorted(order)
                .map(t -> new TodayTaskResponse(taskApiMapper.toResponse(t), reason, blockedIds.contains(t.getId())))
                .toList();
    }
}
