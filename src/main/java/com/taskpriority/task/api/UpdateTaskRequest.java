package com.taskpriority.task.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record UpdateTaskRequest(
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
        @Valid CreateTaskRequest.RecurrenceRuleRequest recurrence
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
}
