package com.example.taskpriority.service;

import com.example.taskpriority.model.*;
import com.example.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Task save(Task task) {
        computeDerivedFields(task);
        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public List<Task> findAll() {
        List<Task> tasks = taskRepository.findAll();
        tasks.forEach(this::computeDerivedFields);
        return tasks;
    }

    @Transactional(readOnly = true)
    public Map<PriorityCategory, List<Task>> getMatrixView() {
        List<Task> active = taskRepository.findAll().stream()
                .filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED)
                .toList();
        active.forEach(this::computeDerivedFields);
        return active.stream().collect(Collectors.groupingBy(Task::getPriorityCategory));
    }

    @Transactional(readOnly = true)
    public DashboardSummary getDashboardSummary() {
        List<Task> tasks = taskRepository.findAll();
        int total = tasks.size();
        int completed = (int) tasks.stream().filter(t -> t.getStatus() == Status.DONE).count();
        int active = (int) tasks.stream().filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED).count();
        int overdue = taskRepository.findOverdueTasks(LocalDate.now(), Status.DONE).size();
        int dueThisWeek = taskRepository.findByDueDateBetween(LocalDate.now(), LocalDate.now().plusDays(6)).size();
        return new DashboardSummary(total, active, completed, overdue, dueThisWeek);
    }

    @Transactional(readOnly = true)
    public TodayView getTodayView() {
        LocalDate today = LocalDate.now();
        List<Task> overdue = taskRepository.findOverdueTasks(today.minusDays(1), Status.DONE);
        List<Task> dueToday = taskRepository.findByDueDate(today);
        List<Task> active = taskRepository.findAll().stream()
                .filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED)
                .toList();
        active.forEach(this::computeDerivedFields);
        List<Task> topPriority = active.stream()
                .filter(t -> (t.getDueDate() == null || t.getDueDate().isAfter(today)))
                .sorted((a, b) -> Integer.compare(b.getPriorityScore(), a.getPriorityScore()))
                .limit(3)
                .toList();
        return new TodayView(overdue, dueToday, topPriority);
    }

    @Transactional(readOnly = true)
    public List<DailyPlan> getWeeklyPlan() {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(6);
        List<Task> tasks = taskRepository.findByDueDateBetween(start, end);
        tasks.forEach(this::computeDerivedFields);
        Map<LocalDate, List<Task>> byDate =
                tasks.stream().collect(Collectors.groupingBy(t -> t.getDueDate() != null ? t.getDueDate() : start));
        List<DailyPlan> plan = new ArrayList<>();
        for (int i = 0; i <= 6; i++) {
            LocalDate date = start.plusDays(i);
            plan.add(new DailyPlan(date, byDate.getOrDefault(date, List.of())));
        }
        return plan;
    }

    public void computeDerivedFields(Task task) {
        int urgencyScore = 0;
        if (task.getDueDate() != null) {
            long daysUntilDue = ChronoUnit.DAYS.between(LocalDate.now(), task.getDueDate());
            if (daysUntilDue < 0) urgencyScore = 30;
            else if (daysUntilDue <= 2) urgencyScore = 20;
            else if (daysUntilDue <= 7) urgencyScore = 10;
        }
        int importanceScore = task.isImportant() ? 50 : 0;
        int statusPenalty = (task.getStatus() == Status.DONE || task.getStatus() == Status.CANCELLED) ? -100 : 0;
        int effortPenalty = switch (task.getEffort()) {
            case QUICK -> 0;
            case MEDIUM -> 5;
            case DEEP_WORK -> 10;
            case LARGE -> 20;
        };
        int score = importanceScore + urgencyScore + statusPenalty - effortPenalty;
        task.setPriorityScore(score);

        boolean urgent = urgencyScore >= 20;
        boolean important = task.isImportant();
        PriorityCategory category;
        if (important && urgent) category = PriorityCategory.DO_NOW;
        else if (important) category = PriorityCategory.SCHEDULE;
        else if (urgent) category = PriorityCategory.DELEGATE;
        else category = PriorityCategory.DELETE;
        task.setPriorityCategory(category);

        if (task.getCreatedDate() != null) {
            long ageDays = ChronoUnit.DAYS.between(task.getCreatedDate().toLocalDate(), LocalDate.now());
            AgeFlag flag;
            if (ageDays <= 7) flag = AgeFlag.NEW;
            else if (ageDays <= 30) flag = AgeFlag.AGING;
            else flag = AgeFlag.STALE;
            task.setAgeFlag(flag);
        }
    }

    public record DashboardSummary(int totalTasks, int activeTasks, int completedTasks,
                                   int overdueTasks, int dueThisWeek) {}

    public record TodayView(List<Task> overdue, List<Task> dueToday, List<Task> topPriority) {}

    public record DailyPlan(LocalDate date, List<Task> tasks) {}

    @Transactional(readOnly = true)
    public List<DuplicateGroup> findPotentialDuplicates() {
        List<Task> tasks = taskRepository.findAll();
        Map<String, List<Task>> byNormalizedTitle =
                tasks.stream().collect(Collectors.groupingBy(t -> normalize(t.getTitle())));
        List<DuplicateGroup> duplicates = new ArrayList<>();
        byNormalizedTitle.forEach((title, group) -> {
            if (group.size() > 1) duplicates.add(new DuplicateGroup(title, group));
        });
        return duplicates;
    }

    private String normalize(String s) { return s == null ? "" : s.trim().toLowerCase(); }

    public record DuplicateGroup(String normalizedTitle, List<Task> tasks) {}

    @Transactional(readOnly = true)
    public List<Task> getArchive() {
        return taskRepository.findAll().stream()
                .filter(t -> t.getStatus() == Status.DONE || t.getStatus() == Status.CANCELLED)
                .peek(this::computeDerivedFields)
                .toList();
    }

    @Transactional(readOnly = true)
    public String exportCalendar() {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\n");
        sb.append("VERSION:2.0\n");
        sb.append("PRODID:-//TaskPriorityTracker//EN\n");
        List<Task> tasks = taskRepository.findAll();
        for (Task task : tasks) {
            if (task.getDueDate() != null) {
                String uid = "TASK-" + task.getId() + "@tasktracker";
                String date = task.getDueDate().toString().replace("-", "");
                sb.append("BEGIN:VEVENT\n");
                sb.append("UID:").append(uid).append("\n");
                sb.append("DTSTAMP:").append(date).append("T000000Z\n");
                sb.append("DTSTART;VALUE=DATE:").append(date).append("\n");
                sb.append("SUMMARY:").append(escapeIcsText(task.getTitle())).append("\n");
                if (task.getDescription() != null) {
                    sb.append("DESCRIPTION:").append(escapeIcsText(task.getDescription())).append("\n");
                }
                sb.append("END:VEVENT\n");
            }
        }
        sb.append("END:VCALENDAR\n");
        return sb.toString();
    }

    private String escapeIcsText(String text) {
        return text.replace("\\", "\\\\")
                .replace("\n", "\\n")
                .replace(",", "\\,")
                .replace(";", "\\;");
    }
}
