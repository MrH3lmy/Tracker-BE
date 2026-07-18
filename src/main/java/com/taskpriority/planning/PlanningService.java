package com.taskpriority.planning;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Area;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskDependency;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PlanningService {
    private static final double MEDIUM_RISK_UTILIZATION = 0.85;

    private final TaskRepository taskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final TaskService taskService;
    private final WorkingCalendarService workingCalendarService;
    private final CurrentUserService currentUserService;

    public PlanningService(TaskRepository taskRepository, TaskDependencyRepository taskDependencyRepository, TaskService taskService, WorkingCalendarService workingCalendarService, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.taskService = taskService;
        this.workingCalendarService = workingCalendarService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public TaskService.TodayView getTodayView() {
        Long userId = currentUserService.requireUserId();
        LocalDate today = LocalDate.now();
        List<Task> overdue = taskRepository.findOverdueTasks(userId, today.minusDays(1), Status.DONE).stream()
                .filter(this::isWorkPlanningScope).toList();
        List<Task> dueToday = taskRepository.findByUserIdAndDueDate(userId, today).stream()
                .filter(this::isWorkPlanningScope).toList();
        List<Task> active = taskRepository.findByUserId(userId).stream()
                .filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED)
                .filter(this::isWorkPlanningScope)
                .toList();
        taskService.computeDerivedFieldsBatch(active);
        List<Task> topPriority = active.stream().filter(t -> t.getDueDate() == null || t.getDueDate().isAfter(today))
                .sorted((a, b) -> Integer.compare(b.getPriorityScore(), a.getPriorityScore())).limit(3).toList();
        return new TaskService.TodayView(overdue, dueToday, topPriority);
    }

    @Transactional(readOnly = true)
    public List<TaskService.DailyPlan> getWeeklyPlan() {
        Long userId = currentUserService.requireUserId();
        LocalDate start = LocalDate.now();
        WorkingCalendarService.CalendarSettings calendarSettings = workingCalendarService.getCalendarSettings();
        List<LocalDate> planningDates = workingCalendarService.nextWorkingDays(start, 7, calendarSettings);
        if (planningDates.isEmpty()) return List.of();
        LocalDate end = planningDates.get(planningDates.size() - 1);
        List<Task> tasks = taskRepository.findByUserIdAndDueDateBetween(userId, planningDates.get(0), end).stream()
                .filter(task -> workingCalendarService.isWorkingDay(task.getDueDate(), calendarSettings))
                .filter(this::isWorkPlanningScope)
                .toList();
        taskService.computeDerivedFieldsBatch(tasks);
        Map<LocalDate, List<Task>> byDate = tasks.stream().collect(Collectors.groupingBy(Task::getDueDate));
        List<TaskService.DailyPlan> plan = new ArrayList<>();
        for (LocalDate date : planningDates) plan.add(new TaskService.DailyPlan(date, byDate.getOrDefault(date, List.of())));
        return plan;
    }

    @Transactional(readOnly = true)
    public ProjectPlanResponse getProjectBoard() {
        Long userId = currentUserService.requireUserId();
        LocalDate today = LocalDate.now();
        List<Task> tasks = taskRepository.findByUserId(userId).stream()
                .filter(task -> !task.isDeleted())
                .filter(task -> task.getStatus() != Status.DONE && task.getStatus() != Status.CANCELLED)
                .filter(this::isWorkPlanningScope)
                .sorted(Comparator.comparing((Task task) -> normalize(task.getTrack()))
                        .thenComparing(task -> normalize(phaseFor(task)))
                        .thenComparing(task -> task.getStatus().name())
                        .thenComparing(task -> task.getDueDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getPosition)
                        .thenComparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        Map<Long, List<Long>> dependencyIdsByTask = new LinkedHashMap<>();
        Map<Long, List<Long>> blockingTaskIdsByTask = new LinkedHashMap<>();
        for (TaskDependency dependency : taskDependencyRepository.findByUserId(userId)) {
            Long taskId = dependency.getTask().getId();
            Long blocksTaskId = dependency.getBlocksTask().getId();
            dependencyIdsByTask.computeIfAbsent(blocksTaskId, ignored -> new ArrayList<>()).add(taskId);
            blockingTaskIdsByTask.computeIfAbsent(taskId, ignored -> new ArrayList<>()).add(blocksTaskId);
        }

        Map<ColumnKey, List<Task>> tasksByColumn = tasks.stream().collect(Collectors.groupingBy(
                task -> new ColumnKey(normalize(task.getTrack()), normalize(phaseFor(task)), task.getStatus()),
                LinkedHashMap::new,
                Collectors.toList()));

        WorkingCalendarService.CalendarSettings calendarSettings = workingCalendarService.getCalendarSettings();
        List<PlannerColumnResponse> columns = tasksByColumn.entrySet().stream()
                .map(entry -> toColumnResponse(entry.getKey(), entry.getValue(), dependencyIdsByTask, blockingTaskIdsByTask, today, calendarSettings))
                .toList();

        double totalEstimatedHours = roundHours(tasks.stream().mapToInt(this::estimatedMinutes).sum() / 60.0);
        LocalDate latestDueDate = latestDueDate(tasks);
        int remainingWorkingDays = remainingWorkingDays(today, latestDueDate, calendarSettings);
        double availableCapacityHours = roundHours(remainingWorkingDays * calendarSettings.defaultDailyCapacityHours());
        PlannerRiskResponse risk = capacityRisk(totalEstimatedHours, availableCapacityHours, remainingWorkingDays, "project board");
        PlanningCalendarResponse calendar = new PlanningCalendarResponse(
                calendarSettings.excludedWeekdays().stream().map(Enum::name).toList(),
                calendarSettings.holidayDates()
        );

        return new ProjectPlanResponse(today, calendarSettings.defaultDailyCapacityHours(), remainingWorkingDays, totalEstimatedHours,
                availableCapacityHours, calendar, risk, columns);
    }

    private PlannerColumnResponse toColumnResponse(ColumnKey key, List<Task> tasks, Map<Long, List<Long>> dependencyIdsByTask,
                                                   Map<Long, List<Long>> blockingTaskIdsByTask, LocalDate today,
                                                   WorkingCalendarService.CalendarSettings calendarSettings) {
        double totalEstimatedHours = roundHours(tasks.stream().mapToInt(this::estimatedMinutes).sum() / 60.0);
        LocalDate latestDueDate = latestDueDate(tasks);
        int remainingWorkingDays = remainingWorkingDays(today, latestDueDate, calendarSettings);
        double availableCapacityHours = roundHours(remainingWorkingDays * calendarSettings.defaultDailyCapacityHours());
        PlannerRiskResponse columnRisk = capacityRisk(totalEstimatedHours, availableCapacityHours, remainingWorkingDays,
                "%s / %s / %s".formatted(key.track(), key.phase(), key.status()));

        List<PlannerTaskResponse> taskResponses = tasks.stream()
                .map(task -> toPlannerTaskResponse(task, columnRisk, dependencyIdsByTask, blockingTaskIdsByTask, today, calendarSettings))
                .toList();

        return new PlannerColumnResponse(key.key(), key.track(), key.phase(), key.status(), tasks.size(), totalEstimatedHours,
                remainingWorkingDays, availableCapacityHours, columnRisk, taskResponses);
    }

    private PlannerTaskResponse toPlannerTaskResponse(Task task, PlannerRiskResponse columnRisk,
                                                      Map<Long, List<Long>> dependencyIdsByTask,
                                                      Map<Long, List<Long>> blockingTaskIdsByTask,
                                                      LocalDate today,
                                                      WorkingCalendarService.CalendarSettings calendarSettings) {
        List<Long> dependencyIds = sortedIds(dependencyIdsByTask.get(task.getId()));
        List<Long> blockingTaskIds = sortedIds(blockingTaskIdsByTask.get(task.getId()));
        List<String> blockers = blockersFor(task, dependencyIds);
        Long userId = currentUserService.requireUserId();
        List<Task> subtasks = taskRepository.findByUserIdAndParentTaskIdOrderByPositionAscIdAsc(userId, task.getId());
        PlannerRiskResponse risk = taskRisk(task, columnRisk, blockers, subtasks, today, calendarSettings);
        int aggregateEstimatedMinutes = aggregateEstimatedMinutes(task, subtasks);
        int completedSubtaskCount = (int) subtasks.stream()
                .filter(subtask -> subtask.getStatus() == Status.DONE || subtask.getStatus() == Status.CANCELLED)
                .count();
        int subtaskCount = subtasks.size();
        int subtaskProgressPercent = subtaskCount == 0 ? 0 : (int) Math.round((completedSubtaskCount * 100.0) / subtaskCount);

        return new PlannerTaskResponse(task.getId(), task.getTitle(), task.getStatus(), normalize(task.getTrack()), normalize(phaseFor(task)),
                task.getStartDate(), task.getDueDate(), task.getEstimatedMinutes(), roundHours(estimatedMinutes(task) / 60.0),
                task.getParentTaskId(), subtasks.stream().map(Task::getId).toList(), subtaskCount, completedSubtaskCount,
                subtaskProgressPercent, aggregateEstimatedMinutes, roundHours(aggregateEstimatedMinutes / 60.0),
                risk, dependencyIds, blockingTaskIds, blockers);
    }

    private PlannerRiskResponse taskRisk(Task task, PlannerRiskResponse columnRisk, List<String> blockers, List<Task> subtasks, LocalDate today,
                                         WorkingCalendarService.CalendarSettings calendarSettings) {
        PlannerRiskResponse.Level persistedLevel = mapRiskLevel(task.getRiskLevel());
        List<String> reasons = new ArrayList<>();
        PlannerRiskResponse.Level level = persistedLevel;

        if (task.getRiskReason() != null && !task.getRiskReason().isBlank()) reasons.add(task.getRiskReason());
        if (!blockers.isEmpty()) {
            level = max(level, PlannerRiskResponse.Level.HIGH);
            reasons.add("Blocked by " + String.join(", ", blockers));
        }
        if (task.getDueDate() != null && task.getDueDate().isBefore(today)) {
            level = max(level, PlannerRiskResponse.Level.HIGH);
            reasons.add("Due date has passed.");
        }
        if (task.getDueDate() != null && !workingCalendarService.isWorkingDay(task.getDueDate(), calendarSettings)) {
            level = max(level, PlannerRiskResponse.Level.MEDIUM);
            reasons.add("Due date falls on an excluded calendar day.");
        }
        long incompleteSubtasks = subtasks.stream()
                .filter(subtask -> subtask.getStatus() != Status.DONE && subtask.getStatus() != Status.CANCELLED)
                .count();
        if (incompleteSubtasks > 0 && task.getStatus() == Status.DONE) {
            level = max(level, PlannerRiskResponse.Level.HIGH);
            reasons.add("Parent is done while " + incompleteSubtasks + " subtask(s) remain incomplete.");
        } else if (incompleteSubtasks > 0) {
            level = max(level, PlannerRiskResponse.Level.MEDIUM);
            reasons.add(incompleteSubtasks + " incomplete subtask(s) contribute to this task's delivery risk.");
        }
        if (columnRisk.level() != PlannerRiskResponse.Level.LOW) {
            level = max(level, columnRisk.level());
            reasons.add("Column capacity risk: " + columnRisk.reason());
        }
        if (reasons.isEmpty()) reasons.add("No blockers or capacity warnings detected.");

        return new PlannerRiskResponse(level, String.join(" ", reasons));
    }

    private PlannerRiskResponse capacityRisk(double estimatedHours, double availableCapacityHours, int remainingWorkingDays, String scope) {
        if (estimatedHours <= 0) {
            return new PlannerRiskResponse(PlannerRiskResponse.Level.LOW, "No estimated work is assigned to " + scope + ".");
        }
        if (remainingWorkingDays <= 0) {
            return new PlannerRiskResponse(PlannerRiskResponse.Level.HIGH,
                    "%s has %.1f estimated hours and no remaining working days before the latest due date.".formatted(scope, estimatedHours));
        }
        if (estimatedHours > availableCapacityHours) {
            return new PlannerRiskResponse(PlannerRiskResponse.Level.HIGH,
                    "%s has %.1f estimated hours against %.1f available capacity hours.".formatted(scope, estimatedHours, availableCapacityHours));
        }
        if (estimatedHours >= availableCapacityHours * MEDIUM_RISK_UTILIZATION) {
            return new PlannerRiskResponse(PlannerRiskResponse.Level.MEDIUM,
                    "%s is using %.0f%% of available capacity (%.1f of %.1f hours).".formatted(scope,
                            (estimatedHours / availableCapacityHours) * 100, estimatedHours, availableCapacityHours));
        }
        return new PlannerRiskResponse(PlannerRiskResponse.Level.LOW,
                "%s fits available capacity with %.1f estimated hours against %.1f capacity hours.".formatted(scope, estimatedHours, availableCapacityHours));
    }

    private int remainingWorkingDays(LocalDate today, LocalDate dueDate, WorkingCalendarService.CalendarSettings calendarSettings) {
        return workingCalendarService.countWorkingDaysInclusive(today, dueDate, calendarSettings);
    }

    private LocalDate latestDueDate(List<Task> tasks) {
        return tasks.stream().map(Task::getDueDate).filter(Objects::nonNull).max(LocalDate::compareTo).orElse(null);
    }

    private String phaseFor(Task task) {
        if (task.getPhase() != null && !task.getPhase().isBlank()) return task.getPhase();
        return task.getStatus().name().replace('_', ' ');
    }

    private boolean isWorkPlanningScope(Task task) {
        return Area.WORK_AREAS.contains(task.getArea());
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "Unassigned" : value.trim();
    }

    private int estimatedMinutes(Task task) {
        return task.getEstimatedMinutes() == null ? 0 : task.getEstimatedMinutes();
    }

    private int aggregateEstimatedMinutes(Task task, List<Task> subtasks) {
        return estimatedMinutes(task) + subtasks.stream().mapToInt(this::estimatedMinutes).sum();
    }

    private double roundHours(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private PlannerRiskResponse.Level mapRiskLevel(RiskLevel riskLevel) {
        if (riskLevel == RiskLevel.HIGH || riskLevel == RiskLevel.CRITICAL) return PlannerRiskResponse.Level.HIGH;
        if (riskLevel == RiskLevel.MEDIUM) return PlannerRiskResponse.Level.MEDIUM;
        return PlannerRiskResponse.Level.LOW;
    }

    private PlannerRiskResponse.Level max(PlannerRiskResponse.Level current, PlannerRiskResponse.Level candidate) {
        return candidate.ordinal() > current.ordinal() ? candidate : current;
    }

    private List<Long> sortedIds(List<Long> ids) {
        if (ids == null) return List.of();
        return ids.stream().sorted().toList();
    }

    private List<String> blockersFor(Task task, List<Long> dependencyIds) {
        List<String> blockers = new ArrayList<>();
        if (task.getBlockedReason() != null && !task.getBlockedReason().isBlank()) blockers.add(task.getBlockedReason().trim());
        if (task.getWaitingOn() != null && !task.getWaitingOn().isBlank()) blockers.add("Waiting on " + task.getWaitingOn().trim());
        if (!dependencyIds.isEmpty()) blockers.add("Dependencies: " + dependencyIds.stream().map(String::valueOf).collect(Collectors.joining(", ")));
        return blockers;
    }

    private record ColumnKey(String track, String phase, Status status) {
        private String key() {
            return track + "|" + phase + "|" + status;
        }
    }
}
