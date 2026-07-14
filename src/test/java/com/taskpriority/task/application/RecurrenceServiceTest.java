package com.taskpriority.task.application;

import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskSchedule;
import com.taskpriority.repository.TaskScheduleRepository;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecurrenceServiceTest {

    private final TaskScheduleRepository taskScheduleRepository = mock(TaskScheduleRepository.class);
    private final RecurrenceService recurrenceService = new RecurrenceService(taskScheduleRepository);

    @Test
    void completesDailyRecurringTaskAndResetsTask() {
        Task task = recurringTask(RecurrenceRule.Frequency.DAILY, 2);

        boolean handled = recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 5, 26));

        assertTrue(handled);
        assertEquals(Status.NOT_STARTED, task.getStatus());
        assertNull(task.getCompletedDate());
        assertEquals(LocalDate.of(2026, 5, 28), task.getDueDate());
        assertEquals(LocalDate.of(2026, 5, 26), task.getRecurrenceRule().getLastCompletedDate());
        assertEquals(LocalDate.of(2026, 5, 28), task.getRecurrenceRule().getNextDueDate());
    }

    @Test
    void computesWeeklyNextDateUsingDayConstraints() {
        Task task = recurringTask(RecurrenceRule.Frequency.WEEKLY, 1);
        task.getRecurrenceRule().setDaysOfWeek(List.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY));

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 5, 26)); // Tuesday

        assertEquals(LocalDate.of(2026, 5, 28), task.getDueDate()); // Thursday
    }

    @Test
    void computesMonthlyNextDateUsingDayConstraint() {
        Task task = recurringTask(RecurrenceRule.Frequency.MONTHLY, 1);
        task.getRecurrenceRule().setDayOfMonth(31);

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 4, 30));

        assertEquals(LocalDate.of(2026, 5, 31), task.getDueDate());
    }

    @Test
    void computesYearlyNextDateUsingAnnualDateConstraint() {
        Task task = recurringTask(RecurrenceRule.Frequency.YEARLY, 1);
        task.getRecurrenceRule().setAnnualDate(MonthDay.of(2, 29));

        recurrenceService.completeRecurringTask(task, LocalDate.of(2025, 2, 28));

        assertEquals(LocalDate.of(2026, 2, 28), task.getDueDate());
    }

    @Test
    void streakIncrementsOnConsecutiveOnTimeCompletionsAndResetsAfterAMissedCycle() {
        Task task = recurringTask(RecurrenceRule.Frequency.DAILY, 2);

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 5, 26)); // due null -> on time
        assertEquals(1, task.getRecurrenceRule().getCurrentStreak());
        assertEquals(1, task.getRecurrenceRule().getLongestStreak());

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 5, 28)); // completed on the due date -> on time
        assertEquals(2, task.getRecurrenceRule().getCurrentStreak());
        assertEquals(2, task.getRecurrenceRule().getLongestStreak());

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 6, 5)); // well after the 5/30 due date -> missed a cycle
        assertEquals(1, task.getRecurrenceRule().getCurrentStreak());
        assertEquals(2, task.getRecurrenceRule().getLongestStreak());
    }

    @Test
    void rollsTaskScheduleForwardToTheNextDueDateWhenOneExists() {
        Task task = recurringTask(RecurrenceRule.Frequency.DAILY, 1);
        task.setId(10L);
        TaskSchedule schedule = new TaskSchedule();
        schedule.setScheduledDate(LocalDate.of(2026, 5, 26));
        when(taskScheduleRepository.findByTaskId(10L)).thenReturn(Optional.of(schedule));

        recurrenceService.completeRecurringTask(task, LocalDate.of(2026, 5, 26));

        assertEquals(LocalDate.of(2026, 5, 27), schedule.getScheduledDate());
        verify(taskScheduleRepository).save(schedule);
    }

    private Task recurringTask(RecurrenceRule.Frequency frequency, int interval) {
        Task task = new Task("Recurring");
        RecurrenceRule rule = new RecurrenceRule();
        rule.setFrequency(frequency);
        rule.setInterval(interval);
        task.setRecurrenceRule(rule);
        return task;
    }
}
