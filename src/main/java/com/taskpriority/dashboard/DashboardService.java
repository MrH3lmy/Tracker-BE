package com.taskpriority.dashboard;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.PriorityEngine;
import com.taskpriority.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private final TaskRepository taskRepository;
    private final PriorityEngine priorityEngine;
    private final CurrentUserService currentUserService;
    public DashboardService(TaskRepository taskRepository, PriorityEngine priorityEngine, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.priorityEngine = priorityEngine;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public TaskService.DashboardSummary getDashboardSummary() {
        Long userId = currentUserService.requireUserId();
        List<Task> tasks = taskRepository.findByUserId(userId);
        int total = tasks.size();
        int completed = (int) tasks.stream().filter(t -> t.getStatus() == Status.DONE).count();
        int active = (int) tasks.stream().filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED).count();
        int overdue = taskRepository.findOverdueTasks(userId, LocalDate.now(), Status.DONE).size();
        int dueToday = taskRepository.findByUserIdAndDueDate(userId, LocalDate.now()).size();
        int dueThisWeek = taskRepository.findByUserIdAndDueDateBetween(userId, LocalDate.now(), LocalDate.now().plusDays(6)).size();
        int important = (int) tasks.stream().filter(Task::isImportant).count();
        int deleted = (int) tasks.stream().filter(Task::isDeleted).count();
        int blocked = (int) tasks.stream().filter(t -> t.getStatus() == Status.BLOCKED).count();
        int waiting = (int) tasks.stream().filter(t -> t.getStatus() == Status.WAITING).count();
        double completionRate = total == 0 ? 0d : (completed * 100.0) / total;
        Map<Status, Long> byStatus = tasks.stream().collect(Collectors.groupingBy(Task::getStatus, Collectors.counting()));
        Map<com.taskpriority.model.PriorityCategory, Long> byPriorityCategory = tasks.stream()
                .filter(t -> !t.isDeleted())
                .collect(Collectors.groupingBy(t -> priorityEngine.compute(t).priorityCategory(), Collectors.counting()));
        return new TaskService.DashboardSummary(total, active, completed, overdue, dueToday, dueThisWeek, important, deleted, blocked, waiting, completionRate, byStatus, byPriorityCategory);
    }
}
