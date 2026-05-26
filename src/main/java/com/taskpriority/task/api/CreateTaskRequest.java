package com.taskpriority.task.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.Status;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateTaskRequest(
        @NotBlank String title,
        String description,
        LocalDate dueDate,
        boolean important,
        Status status,
        Area area,
        Effort effort,
        String blockedReason,
        String waitingOn,
        LocalDate followUpDate
) {}
