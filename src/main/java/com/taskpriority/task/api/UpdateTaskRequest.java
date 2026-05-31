package com.taskpriority.task.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.Status;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateTaskRequest(
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
        @Valid CreateTaskRequest.RecurrenceRuleRequest recurrence
) {
    @AssertTrue(message = "blockedReason is recommended when status is BLOCKED")
    boolean isBlockedReasonGuidanceSatisfied() {
        return status != Status.BLOCKED || (blockedReason != null && !blockedReason.isBlank());
    }

    @AssertTrue(message = "waitingOn and followUpDate are recommended when status is WAITING")
    boolean isWaitingGuidanceSatisfied() {
        return status != Status.WAITING || ((waitingOn != null && !waitingOn.isBlank()) && followUpDate != null);
    }
}
