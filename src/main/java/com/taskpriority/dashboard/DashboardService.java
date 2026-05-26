package com.taskpriority.dashboard;

import com.taskpriority.model.Status;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DashboardService {
    private final TaskRepository taskRepository;
    public DashboardService(TaskRepository taskRepository) { this.taskRepository = taskRepository; }

    @Transactional(readOnly = true)
    public TaskService.DashboardSummary getDashboardSummary() {
        List<?> tasks = taskRepository.findAll();
        int total = tasks.size();
        int completed = (int) taskRepository.findAll().stream().filter(t -> t.getStatus() == Status.DONE).count();
        int active = (int) taskRepository.findAll().stream().filter(t -> t.getStatus() != Status.DONE && t.getStatus() != Status.CANCELLED).count();
        int overdue = taskRepository.findOverdueTasks(LocalDate.now(), Status.DONE).size();
        int dueThisWeek = taskRepository.findByDueDateBetween(LocalDate.now(), LocalDate.now().plusDays(6)).size();
        return new TaskService.DashboardSummary(total, active, completed, overdue, dueThisWeek);
    }
}
