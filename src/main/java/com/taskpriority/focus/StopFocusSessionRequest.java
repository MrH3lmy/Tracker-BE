package com.taskpriority.focus;

import jakarta.validation.constraints.Size;

public record StopFocusSessionRequest(
        @Size(max = 2000, message = "note must be 2000 characters or fewer")
        String note,
        Boolean completeTask
) {}
