package com.taskpriority.service;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskDependency;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BlockerAnalysisService {
    private static final int STALE_WAITING_DAYS = 7;
    private static final int HIGH_PRIORITY_SCORE = 50;

    private final TaskRepository taskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final TaskService taskService;

    public BlockerAnalysisService(TaskRepository taskRepository, TaskDependencyRepository taskDependencyRepository, TaskService taskService) {
        this.taskRepository = taskRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.taskService = taskService;
    }

    @Transactional(readOnly = true)
    public BlockerAnalysis analyze() {
        LocalDate today = LocalDate.now();
        List<Task> tasks = taskRepository.findAll();
        taskService.computeDerivedFieldsBatch(tasks);
        Map<Long, Task> byId = tasks.stream().filter(task -> task.getId() != null).collect(Collectors.toMap(Task::getId, Function.identity()));
        List<TaskDependency> dependencies = taskDependencyRepository.findAll();
        Map<Long, List<Long>> blockedBy = dependencies.stream().collect(Collectors.groupingBy(
                dependency -> dependency.getTask().getId(),
                Collectors.mapping(dependency -> dependency.getBlocksTask().getId(), Collectors.toList())));
        Map<Long, List<Long>> blocks = dependencies.stream().collect(Collectors.groupingBy(
                dependency -> dependency.getBlocksTask().getId(),
                Collectors.mapping(dependency -> dependency.getTask().getId(), Collectors.toList())));

        List<BlockerWarning> warnings = new ArrayList<>();
        for (Task task : tasks) {
            if (task.getStatus() == Status.WAITING) {
                long waitingDays = task.getCreatedDate() == null ? 0 : ChronoUnit.DAYS.between(task.getCreatedDate().toLocalDate(), today);
                if (waitingDays >= STALE_WAITING_DAYS) {
                    warnings.add(warning("STALE_WAITING", "Waiting too long", task,
                            "Task has been waiting for " + waitingDays + " days.", "Set a follow-up or move it forward.", List.of()));
                }
                if (isBlank(task.getWaitingOn())) {
                    warnings.add(warning("MISSING_WAITING_ON", "Missing waitingOn", task,
                            "Waiting task does not say who or what it is waiting on.", "Add waitingOn context.", List.of()));
                }
                if (task.getFollowUpDate() == null) {
                    warnings.add(warning("MISSING_FOLLOW_UP", "Missing follow-up date", task,
                            "Waiting task has no follow-up date.", "Set a follow-up date.", List.of()));
                }
            }
            if ((task.getStatus() == Status.WAITING || task.getStatus() == Status.BLOCKED)
                    && task.getFollowUpDate() != null
                    && task.getFollowUpDate().isBefore(today)) {
                warnings.add(warning("OVERDUE_FOLLOW_UP", "Overdue follow-up", task,
                        "Follow-up date was " + task.getFollowUpDate() + ".", "Follow up today or reschedule.", List.of()));
            }
            List<Long> blockedTaskIds = blocks.getOrDefault(task.getId(), List.of());
            List<Long> highPriorityBlocked = blockedTaskIds.stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .filter(blocked -> blocked.getPriorityScore() >= HIGH_PRIORITY_SCORE || blocked.isImportant() || blocked.isUrgent())
                    .map(Task::getId)
                    .toList();
            if (!highPriorityBlocked.isEmpty()) {
                warnings.add(warning("BLOCKS_HIGH_PRIORITY", "Blocking high-priority work", task,
                        "This task blocks " + highPriorityBlocked.size() + " high-priority task(s).", "Resolve this blocker first.", highPriorityBlocked));
            }
        }

        for (List<Long> cycle : findCycles(blockedBy)) {
            Long firstId = cycle.isEmpty() ? null : cycle.get(0);
            Task task = firstId == null ? null : byId.get(firstId);
            warnings.add(new BlockerWarning("CIRCULAR_DEPENDENCY", "Circular dependency", firstId,
                    task == null ? null : task.getTitle(), task == null ? null : task.getStatus(), task == null ? 0 : task.getPriorityScore(),
                    "Dependency chain loops through tasks " + cycle + ".", "Remove one dependency link to break the cycle.", cycle));
        }

        return new BlockerAnalysis(warnings, dependencies.size());
    }

    private BlockerWarning warning(String type, String title, Task task, String message, String recommendation, List<Long> relatedTaskIds) {
        return new BlockerWarning(type, title, task.getId(), task.getTitle(), task.getStatus(), task.getPriorityScore(), message, recommendation, relatedTaskIds);
    }

    private List<List<Long>> findCycles(Map<Long, List<Long>> graph) {
        List<List<Long>> cycles = new ArrayList<>();
        Set<Long> visited = new HashSet<>();
        Set<Long> stack = new HashSet<>();
        Deque<Long> path = new ArrayDeque<>();
        for (Long node : graph.keySet()) {
            detectCycle(node, graph, visited, stack, path, cycles);
        }
        return cycles;
    }

    private void detectCycle(Long node, Map<Long, List<Long>> graph, Set<Long> visited, Set<Long> stack, Deque<Long> path, List<List<Long>> cycles) {
        if (stack.contains(node)) {
            List<Long> cycle = new ArrayList<>(path);
            int index = cycle.indexOf(node);
            if (index >= 0) {
                cycles.add(cycle.subList(index, cycle.size()));
            }
            return;
        }
        if (!visited.add(node)) return;
        stack.add(node);
        path.addLast(node);
        for (Long next : graph.getOrDefault(node, List.of())) {
            detectCycle(next, graph, visited, stack, path, cycles);
        }
        path.removeLast();
        stack.remove(node);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record BlockerAnalysis(List<BlockerWarning> warnings, int dependencyCount) {}
    public record BlockerWarning(String type, String title, Long taskId, String taskTitle, Status status, int priorityScore,
                                 String message, String recommendation, List<Long> relatedTaskIds) {}
}
