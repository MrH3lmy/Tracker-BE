package com.taskpriority.task.api;

import jakarta.validation.constraints.Positive;

public record UpdateTaskProjectRequest(
        @Positive(message = "projectId must be greater than 0")
        Long projectId
) {}
