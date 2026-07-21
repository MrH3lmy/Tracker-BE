package com.taskpriority.weeklyreview;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record TaskDecisionRequest(
        @NotNull(message = "taskId is required")
        Long taskId,
        @NotNull(message = "action is required")
        DecisionAction action,
        LocalDate newDueDate
) {}
