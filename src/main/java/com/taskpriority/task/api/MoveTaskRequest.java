package com.taskpriority.task.api;

import com.taskpriority.model.Status;
import jakarta.validation.constraints.Min;

public record MoveTaskRequest(
        Status status,
        Long boardColumnId,
        @Min(value = 0, message = "position must be greater than or equal to 0")
        Integer position
) {}
