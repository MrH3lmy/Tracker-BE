package com.taskpriority.task.application;

import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecurrenceServiceTest {

    private final RecurrenceService recurrenceService = new RecurrenceService();

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

    private Task recurringTask(RecurrenceRule.Frequency frequency, int interval) {
        Task task = new Task("Recurring");
        RecurrenceRule rule = new RecurrenceRule();
        rule.setFrequency(frequency);
        rule.setInterval(interval);
        task.setRecurrenceRule(rule);
        return task;
    }
}
