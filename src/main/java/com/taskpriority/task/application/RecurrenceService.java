package com.taskpriority.task.application;

import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Service
public class RecurrenceService {
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

        LocalDate nextDueDate = computeNextDueDate(recurrenceRule, completionDate);
        recurrenceRule.setLastCompletedDate(completionDate);
        recurrenceRule.setNextDueDate(nextDueDate);

        // same-task reset strategy: keep one live task and roll it forward.
        task.setStatus(Status.NOT_STARTED);
        task.setDueDate(nextDueDate);
        task.setCompletedDate(null);
        return true;
    }

    LocalDate computeNextDueDate(RecurrenceRule recurrenceRule, LocalDate completionDate) {
        int interval = Math.max(1, recurrenceRule.getInterval());
        return switch (recurrenceRule.getFrequency()) {
            case DAILY -> completionDate.plusDays(interval);
            case WEEKLY -> computeWeeklyNextDate(recurrenceRule.getDaysOfWeek(), completionDate, interval);
            case MONTHLY -> computeMonthlyNextDate(recurrenceRule.getDayOfMonth(), completionDate, interval);
            case YEARLY -> computeYearlyNextDate(recurrenceRule.getAnnualDate(), completionDate, interval);
            case NONE -> completionDate;
        };
    }

    private LocalDate computeWeeklyNextDate(List<DayOfWeek> daysOfWeek, LocalDate completionDate, int interval) {
        if (daysOfWeek == null || daysOfWeek.isEmpty()) {
            return completionDate.plusWeeks(interval);
        }
        List<DayOfWeek> sortedDays = daysOfWeek.stream().distinct().sorted(Comparator.naturalOrder()).toList();
        LocalDate cursor = completionDate.plusDays(1);
        while (true) {
            long weeksBetween = java.time.temporal.ChronoUnit.WEEKS.between(completionDate, cursor);
            if (weeksBetween % interval == 0 && sortedDays.contains(cursor.getDayOfWeek())) {
                return cursor;
            }
            cursor = cursor.plusDays(1);
        }
    }

    private LocalDate computeMonthlyNextDate(Integer configuredDayOfMonth, LocalDate completionDate, int interval) {
        int dayOfMonth = configuredDayOfMonth == null ? completionDate.getDayOfMonth() : configuredDayOfMonth;
        LocalDate candidate = completionDate.plusMonths(interval);
        YearMonth ym = YearMonth.from(candidate);
        return ym.atDay(Math.min(dayOfMonth, ym.lengthOfMonth()));
    }

    private LocalDate computeYearlyNextDate(java.time.MonthDay annualDate, LocalDate completionDate, int interval) {
        LocalDate base = completionDate.plusYears(interval);
        if (annualDate == null) {
            return base;
        }
        int day = Math.min(annualDate.getDayOfMonth(), YearMonth.of(base.getYear(), annualDate.getMonth()).lengthOfMonth());
        return LocalDate.of(base.getYear(), annualDate.getMonth(), day);
    }
}
