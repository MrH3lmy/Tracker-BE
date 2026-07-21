package com.taskpriority.reminder;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record SnoozeNotificationRequest(
        @NotNull(message = "scheduledFor is required")
        @Future(message = "scheduledFor must be in the future")
        LocalDateTime scheduledFor
) {}
