package com.taskpriority.task.api;

import com.taskpriority.model.TaskDependencyType;
import jakarta.validation.constraints.NotNull;

public record DependencyRequest(
        @NotNull(message = "blocksTaskId is required")
        Long blocksTaskId,
        TaskDependencyType dependencyType
) {}
