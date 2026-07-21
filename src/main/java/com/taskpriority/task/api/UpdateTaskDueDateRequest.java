package com.taskpriority.task.api;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateTaskDueDateRequest(
        @NotNull(message = "dueDate is required")
        LocalDate dueDate
) {}
