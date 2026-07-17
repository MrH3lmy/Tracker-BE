package com.taskpriority.task.application;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskScheduleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class RecurrenceService {
    private final TaskScheduleRepository taskScheduleRepository;
    private final CurrentUserService currentUserService;

    public RecurrenceService(TaskScheduleRepository taskScheduleRepository, CurrentUserService currentUserService) {
        this.taskScheduleRepository = taskScheduleRepository;
        this.currentUserService = currentUserService;
    }

    public void applyRecurrenceDefaults(Task task) {
        if (task.getRecurrenceRule() != null && task.getRecurrenceRule().getFrequency() == null) {
            task.setRecurrenceRule(null);
        }
    }

    public boolean completeRecurringTask(Task task, LocalDate completionDate) {
        RecurrenceRule recurrenceRule = task.getRecurrenceRule();
        if (recurrenceRule == null || recurrenceRule.getFrequency() == null || recurrenceRule.getFrequency() == RecurrenceRule.Frequency.NONE) {
            return false;
        }

        LocalDate previousDueDate = recurrenceRule.getNextDueDate();
        LocalDate nextDueDate = computeNextDueDate(recurrenceRule, completionDate);
        recurrenceRule.setLastCompletedDate(completionDate);
        recurrenceRule.setNextDueDate(nextDueDate);
        RecurrenceMath.updateStreak(recurrenceRule, previousDueDate, completionDate);

        // same-task reset strategy: keep one live task and roll it forward.
        task.setStatus(Status.NOT_STARTED);
        task.setDueDate(nextDueDate);
        task.setCompletedDate(null);

        rollScheduleForward(task, nextDueDate);
        return true;
    }

    private void rollScheduleForward(Task task, LocalDate nextDueDate) {
        if (task.getId() == null) {
            return;
        }
        Long userId = currentUserService.requireUserId();
        taskScheduleRepository.findByUserIdAndTaskId(userId, task.getId()).ifPresent(schedule -> {
            schedule.setScheduledDate(nextDueDate);
            taskScheduleRepository.save(schedule);
        });
    }

    LocalDate computeNextDueDate(RecurrenceRule recurrenceRule, LocalDate completionDate) {
        return RecurrenceMath.computeNextDueDate(recurrenceRule, completionDate);
    }
}
