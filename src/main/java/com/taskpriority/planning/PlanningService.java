package com.taskpriority.planning;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PlanningService {
    private final TaskRepository taskRepository;
    private final TaskService taskService;

    public PlanningService(TaskRepository taskRepository, TaskService taskService) {
        this.taskRepository = taskRepository;
        this.taskService = taskService;
    }

    @Transactional(readOnly = true)
    public TaskService.TodayView getTodayView() {
        LocalDate today = LocalDate.now();
        List<Task> overdue = taskRepository.findOverdueTasks(today.minusDays(1), Status.DONE);
        List<Task> dueToday = taskRepository.findByDueDate(today);
        List<Task> active = taskRepository.findAll().stream().filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED).toList();
        active.forEach(taskService::computeDerivedFields);
        List<Task> topPriority = active.stream().filter(t -> t.getDueDate() == null || t.getDueDate().isAfter(today))
                .sorted((a, b) -> Integer.compare(b.getPriorityScore(), a.getPriorityScore())).limit(3).toList();
        return new TaskService.TodayView(overdue, dueToday, topPriority);
    }

    @Transactional(readOnly = true)
    public List<TaskService.DailyPlan> getWeeklyPlan() {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(6);
        List<Task> tasks = taskRepository.findByDueDateBetween(start, end);
        tasks.forEach(taskService::computeDerivedFields);
        Map<LocalDate, List<Task>> byDate = tasks.stream().collect(Collectors.groupingBy(Task::getDueDate));
        List<TaskService.DailyPlan> plan = new ArrayList<>();
        for (int i = 0; i <= 6; i++) plan.add(new TaskService.DailyPlan(start.plusDays(i), byDate.getOrDefault(start.plusDays(i), List.of())));
        return plan;
    }
}
