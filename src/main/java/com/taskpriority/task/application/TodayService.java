package com.taskpriority.task.application;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Task;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskReadinessService;
import com.taskpriority.service.TaskService;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TodayReason;
import com.taskpriority.task.api.TodayResponse;
import com.taskpriority.task.api.TodayTaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Backend read model for "what should I care about today" (issue #286) - due-today, overdue, and
 * (when the task has a start date) scheduled-today tasks, scoped optionally to one project.
 *
 * <p>Blocked/ready status per task comes entirely from {@link TaskService#computeDerivedFieldsBatch}
 * (which delegates to {@link TaskReadinessService}, issue #282's single authoritative dependency
 * readiness definition) rather than a separate query here - Today does not maintain its own
 * blocked-state computation.
 */
@Service
public class TodayService {
    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final ProjectRepository projectRepository;
    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;
    private final Clock clock;

    public TodayService(TaskRepository taskRepository, TaskService taskService, TaskApiMapper taskApiMapper,
                         ProjectRepository projectRepository, SettingsService settingsService,
                         CurrentUserService currentUserService, Clock clock) {
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.projectRepository = projectRepository;
        this.settingsService = settingsService;
        this.currentUserService = currentUserService;
        this.clock = clock;
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
        // Reads the instant from the injected Clock (real wall clock in production, fixed in
        // tests - see ClockConfig) rather than calling Instant.now()/LocalDate.now() directly.
        LocalDate today = LocalDate.now(clock.withZone(settingsService.getTimezoneForUser(userId)));

        List<Task> overdue = taskRepository.findOverdueForToday(userId, projectId, today, TaskReadinessService.CLOSED_STATUSES);
        List<Task> dueToday = taskRepository.findDueTodayForToday(userId, projectId, today, TaskReadinessService.CLOSED_STATUSES);
        List<Task> scheduledToday = taskRepository.findScheduledForToday(userId, projectId, today, TaskReadinessService.CLOSED_STATUSES);

        List<Task> all = new ArrayList<>(overdue.size() + dueToday.size() + scheduledToday.size());
        all.addAll(overdue);
        all.addAll(dueToday);
        all.addAll(scheduledToday);
        // Also computes each task's blocked/ready state (TaskReadinessService) in the same batch
        // query as dependencyIds/subtaskIds - no separate blocked-lookup query here.
        taskService.computeDerivedFieldsBatch(all);

        List<TodayTaskResponse> tasks = new ArrayList<>();
        tasks.addAll(toResponses(overdue, TodayReason.OVERDUE));
        tasks.addAll(toResponses(dueToday, TodayReason.DUE_TODAY));
        tasks.addAll(toResponses(scheduledToday, TodayReason.SCHEDULED_TODAY));

        return new TodayResponse(today, tasks);
    }

    /** Deterministic within each Today bucket: priority score desc, due date asc (nulls last), id asc. */
    private List<TodayTaskResponse> toResponses(List<Task> tasks, TodayReason reason) {
        Comparator<Task> order = Comparator
                .comparingInt((Task t) -> -t.getPriorityScore())
                .thenComparing((Task t) -> t.getDueDate() == null ? LocalDate.MAX : t.getDueDate())
                .thenComparing(Task::getId);
        return tasks.stream()
                .sorted(order)
                .map(t -> new TodayTaskResponse(taskApiMapper.toResponse(t), reason, t.isBlocked()))
                .toList();
    }
}
