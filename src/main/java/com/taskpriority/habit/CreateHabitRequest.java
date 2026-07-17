package com.taskpriority.habit;

import com.taskpriority.model.Area;
import com.taskpriority.model.RecurrenceRule;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.MonthDay;
import java.util.List;

public record CreateHabitRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,
        String description,
        Area area,
        boolean important,
        @PositiveOrZero(message = "estimatedMinutes must be greater than or equal to 0")
        Integer estimatedMinutes,
        @Positive(message = "dailyTargetCount must be greater than 0")
        Integer dailyTargetCount,
        boolean reminderEnabled,
        LocalTime reminderTime,
        @NotNull(message = "recurrence is required for a habit")
        @Valid HabitRecurrenceRequest recurrence
) {
    @AssertTrue(message = "reminderTime is required when reminderEnabled is true")
    boolean isReminderValid() { return !reminderEnabled || reminderTime != null; }

    public record HabitRecurrenceRequest(
            @NotNull(message = "frequency is required")
            RecurrenceRule.Frequency frequency,
            @Max(value = 365, message = "interval must be less than or equal to 365")
            int interval,
            List<DayOfWeek> daysOfWeek,
            Integer dayOfMonth,
            MonthDay annualDate
    ) {
        @AssertTrue(message = "frequency must not be NONE for a habit")
        boolean isFrequencyRecurring() { return frequency != RecurrenceRule.Frequency.NONE; }

        @AssertTrue(message = "interval must be greater than 0")
        boolean isIntervalPositive() { return interval > 0; }

        @AssertTrue(message = "daysOfWeek is required for WEEKLY recurrence")
        boolean isWeeklyValid() { return frequency != RecurrenceRule.Frequency.WEEKLY || (daysOfWeek != null && !daysOfWeek.isEmpty()); }

        @AssertTrue(message = "dayOfMonth must be between 1 and 31 for MONTHLY recurrence")
        boolean isMonthlyValid() { return frequency != RecurrenceRule.Frequency.MONTHLY || (dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31); }

        @AssertTrue(message = "annualDate is required for YEARLY recurrence")
        boolean isYearlyValid() { return frequency != RecurrenceRule.Frequency.YEARLY || annualDate != null; }
    }
}
