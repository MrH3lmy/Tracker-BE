package com.taskpriority.task.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;

public record CreateTaskRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,
        String description,
        LocalDate dueDate,
        boolean important,
        Status status,
        Area area,
        Effort effort,
        String blockedReason,
        String waitingOn,
        LocalDate followUpDate,
        Long boardColumnId,
        Integer position,
        List<Long> dependencyIds,
        @Valid RecurrenceRuleRequest recurrence
) {
    @AssertTrue(message = "blockedReason is recommended when status is BLOCKED")
    boolean isBlockedReasonGuidanceSatisfied() {
        return status != Status.BLOCKED || (blockedReason != null && !blockedReason.isBlank());
    }

    @AssertTrue(message = "waitingOn and followUpDate are recommended when status is WAITING")
    boolean isWaitingGuidanceSatisfied() {
        return status != Status.WAITING || ((waitingOn != null && !waitingOn.isBlank()) && followUpDate != null);
    }

    public record RecurrenceRuleRequest(
            @NotNull(message = "frequency is required when recurrence is provided")
            RecurrenceRule.Frequency frequency,
            @Max(value = 365, message = "interval must be less than or equal to 365")
            int interval,
            List<DayOfWeek> daysOfWeek,
            Integer dayOfMonth,
            MonthDay annualDate
    ) {
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
