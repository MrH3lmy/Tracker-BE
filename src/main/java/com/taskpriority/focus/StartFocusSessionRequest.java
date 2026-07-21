package com.taskpriority.focus;

import jakarta.validation.constraints.Positive;

public record StartFocusSessionRequest(
        @Positive(message = "taskId must be greater than 0")
        Long taskId
) {}
