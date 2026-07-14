package com.taskpriority.task.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
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
        LocalDate startDate,
        @PositiveOrZero(message = "estimatedMinutes must be greater than or equal to 0")
        Integer estimatedMinutes,
        @PositiveOrZero(message = "actualMinutes must be greater than or equal to 0")
        Integer actualMinutes,
        RiskLevel riskLevel,
        @Size(max = 500, message = "riskReason must be at most 500 characters")
        String riskReason,
        @Size(max = 120, message = "track must be at most 120 characters")
        String track,
        @Size(max = 120, message = "phase must be at most 120 characters")
        String phase,
        @Positive(message = "parentTaskId must be greater than 0")
        Long parentTaskId,
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
        @Valid RecurrenceRuleRequest recurrence,
        @Positive(message = "dailyTargetCount must be greater than 0")
        Integer dailyTargetCount
) {
    @AssertTrue(message = "startDate must be on or before dueDate")
    boolean isStartDateOnOrBeforeDueDate() {
        return startDate == null || dueDate == null || !startDate.isAfter(dueDate);
    }

    @AssertTrue(message = "followUpDate must be on or after startDate")
    boolean isFollowUpDateOnOrAfterStartDate() {
        return startDate == null || followUpDate == null || !followUpDate.isBefore(startDate);
    }

    @AssertTrue(message = "riskReason is required when riskLevel is HIGH or CRITICAL")
    boolean isRiskReasonProvidedForElevatedRisk() {
        return riskLevel != RiskLevel.HIGH && riskLevel != RiskLevel.CRITICAL || (riskReason != null && !riskReason.isBlank());
    }

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
