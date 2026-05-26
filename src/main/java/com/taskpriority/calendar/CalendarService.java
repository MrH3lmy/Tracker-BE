package com.taskpriority.calendar;

import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.PriorityEngine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CalendarService {
    private final TaskRepository taskRepository;
    private final PriorityEngine priorityEngine;
    public CalendarService(TaskRepository taskRepository, PriorityEngine priorityEngine) { this.taskRepository = taskRepository; this.priorityEngine = priorityEngine; }

    @Transactional(readOnly = true)
    public List<Task> getMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return taskRepository.findByDueDateBetween(ym.atDay(1), ym.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public Map<LocalDate, DaySummary> getMonthSummary(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        List<Task> tasks = taskRepository.findByDueDateBetween(ym.atDay(1), ym.atEndOfMonth());
        Map<LocalDate, List<Task>> grouped = tasks.stream().filter(t -> t.getDueDate() != null && !t.isDeleted())
                .collect(java.util.stream.Collectors.groupingBy(Task::getDueDate));
        Map<LocalDate, DaySummary> result = new LinkedHashMap<>();
        grouped.forEach((date, dayTasks) -> result.put(date, new DaySummary(dayTasks.size(), dayTasks.stream().anyMatch(t -> t.getDueDate().isBefore(LocalDate.now())), dayTasks.stream().anyMatch(Task::isImportant))));
        return result;
    }

    public record DaySummary(int taskCount, boolean hasOverdue, boolean hasImportant) {}

    @Transactional(readOnly = true)
    public String exportCalendar() {
        StringBuilder sb = new StringBuilder("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TaskPriorityTracker//EN\n");
        for (Task task : taskRepository.findAll()) {
            if (task.getDueDate() == null || task.isDeleted()) continue;
            String date = task.getDueDate().toString().replace("-", "");
            int score = priorityEngine.compute(task).priorityScore();
            sb.append("BEGIN:VEVENT\nUID:TASK-").append(task.getId()).append("@tasktracker\nDTSTAMP:").append(date).append("T000000Z\nDTSTART;VALUE=DATE:").append(date).append("\nSUMMARY:").append(task.getTitle()).append("\nDESCRIPTION:status=").append(task.getStatus()).append(";important=").append(task.isImportant()).append(";category=").append(task.getArea()).append(";score=").append(score).append("\nEND:VEVENT\n");
        }
        sb.append("END:VCALENDAR\n");
        return sb.toString();
    }
}
