package com.taskpriority.service;

import com.taskpriority.model.*;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.task.application.RecurrenceService;
import com.taskpriority.service.PriorityEngine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private final TaskRepository taskRepository;
    private final PriorityEngine priorityEngine;
    private final RecurrenceService recurrenceService;

    public TaskService(TaskRepository taskRepository, PriorityEngine priorityEngine, RecurrenceService recurrenceService) {
        this.taskRepository = taskRepository;
        this.priorityEngine = priorityEngine;
        this.recurrenceService = recurrenceService;
    }

    @Transactional
    public Task save(Task task) {
        recurrenceService.applyRecurrenceDefaults(task);
        computeDerivedFields(task);
        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public List<Task> findAll() { return taskRepository.findAll().stream().peek(this::computeDerivedFields).toList(); }

    @Transactional(readOnly = true)
    public Task findById(Long id) { return taskRepository.findById(id).map(t -> { computeDerivedFields(t); return t; }).orElseThrow(); }

    @Transactional
    public void delete(Long id) { taskRepository.deleteById(id); }

    @Transactional
    public Task markComplete(Long id) {
        Task t = findById(id);
        LocalDateTime completionTimestamp = LocalDateTime.now();
        t.setStatus(Status.DONE);
        t.setCompletedDate(completionTimestamp);
        recurrenceService.completeRecurringTask(t, completionTimestamp.toLocalDate());
        return save(t);
    }

    @Transactional
    public Task updateStatus(Long id, Status status) { Task t = findById(id); t.setStatus(status); return save(t); }

    @Transactional(readOnly = true)
    public List<Task> getArchive() { return taskRepository.findAll().stream().filter(t -> t.getStatus()==Status.DONE||t.getStatus()==Status.CANCELLED).peek(this::computeDerivedFields).toList(); }

    @Transactional(readOnly = true)
    public Map<PriorityCategory, List<Task>> getMatrixView() {
        return taskRepository.findAll().stream().filter(t -> t.getStatus()!=Status.DONE && t.getStatus()!=Status.CANCELLED).peek(this::computeDerivedFields)
                .collect(Collectors.groupingBy(Task::getPriorityCategory));
    }

    public void computeDerivedFields(Task task) {
        PriorityEngine.PriorityComputation c = priorityEngine.compute(task);
        task.setDaysLeft(c.daysLeft());task.setOverdue(c.overdue());task.setUrgent(c.urgent());task.setPriorityScore(c.priorityScore());task.setPriorityCategory(c.priorityCategory());task.setAgeFlag(c.ageFlag());task.setPriorityReason(c.priorityReason());
    }

    public record DashboardSummary(int totalTasks, int activeTasks, int completedTasks, int overdueTasks, int dueThisWeek) {}
    public record TodayView(List<Task> overdue, List<Task> dueToday, List<Task> topPriority) {}
    public record DailyPlan(LocalDate date, List<Task> tasks) {}
}
