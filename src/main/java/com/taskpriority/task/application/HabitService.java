package com.taskpriority.task.application;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.HabitCheckIn;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class HabitService {
    private final TaskRepository taskRepository;
    private final HabitCheckInRepository habitCheckInRepository;
    private final RecurrenceService recurrenceService;

    public HabitService(TaskRepository taskRepository, HabitCheckInRepository habitCheckInRepository, RecurrenceService recurrenceService) {
        this.taskRepository = taskRepository;
        this.habitCheckInRepository = habitCheckInRepository;
        this.recurrenceService = recurrenceService;
    }

    @Transactional
    public Task checkIn(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + taskId + " not found"));
        LocalDate today = LocalDate.now();

        HabitCheckIn checkIn = new HabitCheckIn();
        checkIn.setTask(task);
        checkIn.setCheckInDate(today);
        habitCheckInRepository.save(checkIn);

        int todayCount = habitCheckInRepository.countByTaskIdAndCheckInDate(taskId, today);
        boolean alreadyRolledOverToday = task.getRecurrenceRule() != null
                && today.equals(task.getRecurrenceRule().getLastCompletedDate());

        if (todayCount >= effectiveTarget(task) && !alreadyRolledOverToday) {
            if (task.getRecurrenceRule() != null) {
                recurrenceService.completeRecurringTask(task, today);
            } else if (task.getStatus() != Status.DONE) {
                task.setStatus(Status.DONE);
                task.setCompletedDate(LocalDateTime.now());
            }
        }

        applyTodayProgress(task);
        return taskRepository.save(task);
    }

    @Transactional
    public Task undoCheckIn(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + taskId + " not found"));
        habitCheckInRepository.findTopByTaskIdAndCheckInDateOrderByCheckedInAtDesc(taskId, LocalDate.now())
                .ifPresent(habitCheckInRepository::delete);
        applyTodayProgress(task);
        return taskRepository.save(task);
    }

    public void applyTodayProgress(Task task) {
        if (task.getId() == null) {
            task.setTodayCheckInCount(0);
            task.setTodayTargetMet(false);
            return;
        }
        int todayCount = habitCheckInRepository.countByTaskIdAndCheckInDate(task.getId(), LocalDate.now());
        task.setTodayCheckInCount(todayCount);
        task.setTodayTargetMet(todayCount >= effectiveTarget(task));
    }

    public void applyTodayProgressBatch(List<Task> tasks) {
        List<Long> ids = tasks.stream().map(Task::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, Integer> countsByTask = habitCheckInRepository.countByTaskIdInAndCheckInDate(ids, LocalDate.now()).stream()
                .collect(Collectors.toMap(HabitCheckInRepository.TaskCheckInCount::getTaskId, row -> row.getCheckInCount().intValue()));
        for (Task task : tasks) {
            if (task.getId() == null) {
                continue;
            }
            int todayCount = countsByTask.getOrDefault(task.getId(), 0);
            task.setTodayCheckInCount(todayCount);
            task.setTodayTargetMet(todayCount >= effectiveTarget(task));
        }
    }

    private int effectiveTarget(Task task) {
        return task.getDailyTargetCount() == null ? 1 : task.getDailyTargetCount();
    }
}
