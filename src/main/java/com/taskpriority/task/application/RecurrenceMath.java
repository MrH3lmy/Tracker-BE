package com.taskpriority.task.application;

import com.taskpriority.model.RecurrenceRule;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

/**
 * Stateless recurrence date-math shared by Task recurrence ("same-task reset") and Habit
 * recurrence (streak/check-in based) - both own their own {@link RecurrenceRule} row but must
 * compute next-due-dates and streaks identically.
 */
public final class RecurrenceMath {

    private RecurrenceMath() {}

    public static LocalDate computeNextDueDate(RecurrenceRule recurrenceRule, LocalDate completionDate) {
        int interval = Math.max(1, recurrenceRule.getInterval());
        return switch (recurrenceRule.getFrequency()) {
            case DAILY -> completionDate.plusDays(interval);
            case WEEKLY -> computeWeeklyNextDate(recurrenceRule.getDaysOfWeek(), completionDate, interval);
            case MONTHLY -> computeMonthlyNextDate(recurrenceRule.getDayOfMonth(), completionDate, interval);
            case YEARLY -> computeYearlyNextDate(recurrenceRule.getAnnualDate(), completionDate, interval);
            case NONE -> completionDate;
        };
    }

    public static void updateStreak(RecurrenceRule recurrenceRule, LocalDate previousDueDate, LocalDate completionDate) {
        boolean onTime = previousDueDate == null || !completionDate.isAfter(previousDueDate);
        int currentStreak = onTime ? recurrenceRule.getCurrentStreak() + 1 : 1;
        recurrenceRule.setCurrentStreak(currentStreak);
        recurrenceRule.setLongestStreak(Math.max(recurrenceRule.getLongestStreak(), currentStreak));
    }

    private static LocalDate computeWeeklyNextDate(List<DayOfWeek> daysOfWeek, LocalDate completionDate, int interval) {
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

    private static LocalDate computeMonthlyNextDate(Integer configuredDayOfMonth, LocalDate completionDate, int interval) {
        int dayOfMonth = configuredDayOfMonth == null ? completionDate.getDayOfMonth() : configuredDayOfMonth;
        LocalDate candidate = completionDate.plusMonths(interval);
        YearMonth ym = YearMonth.from(candidate);
        return ym.atDay(Math.min(dayOfMonth, ym.lengthOfMonth()));
    }

    private static LocalDate computeYearlyNextDate(java.time.MonthDay annualDate, LocalDate completionDate, int interval) {
        LocalDate base = completionDate.plusYears(interval);
        if (annualDate == null) {
            return base;
        }
        int day = Math.min(annualDate.getDayOfMonth(), YearMonth.of(base.getYear(), annualDate.getMonth()).lengthOfMonth());
        return LocalDate.of(base.getYear(), annualDate.getMonth(), day);
    }
}
