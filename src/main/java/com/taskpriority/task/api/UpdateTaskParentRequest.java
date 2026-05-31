package com.taskpriority.task.api;

import jakarta.validation.constraints.Positive;

public record UpdateTaskParentRequest(
        @Positive(message = "parentTaskId must be greater than 0")
        Long parentTaskId
) {}
