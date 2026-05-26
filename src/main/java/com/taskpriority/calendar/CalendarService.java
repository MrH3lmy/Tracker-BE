package com.taskpriority.calendar;

import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class CalendarService {
    private final TaskRepository taskRepository;
    public CalendarService(TaskRepository taskRepository) { this.taskRepository = taskRepository; }

    @Transactional(readOnly = true)
    public List<Task> getMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return taskRepository.findByDueDateBetween(ym.atDay(1), ym.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public String exportCalendar() {
        StringBuilder sb = new StringBuilder("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TaskPriorityTracker//EN\n");
        for (Task task : taskRepository.findAll()) {
            if (task.getDueDate() == null) continue;
            String date = task.getDueDate().toString().replace("-", "");
            sb.append("BEGIN:VEVENT\nUID:TASK-").append(task.getId()).append("@tasktracker\nDTSTAMP:").append(date).append("T000000Z\nDTSTART;VALUE=DATE:").append(date).append("\nSUMMARY:").append(task.getTitle()).append("\nEND:VEVENT\n");
        }
        sb.append("END:VCALENDAR\n");
        return sb.toString();
    }
}
