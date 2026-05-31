package com.taskpriority.planning;

import com.taskpriority.model.Status;

import java.util.List;

public record PlannerColumnResponse(
        String key,
        String track,
        String phase,
        Status status,
        int taskCount,
        double totalEstimatedHours,
        int remainingWorkingDays,
        double availableCapacityHours,
        PlannerRiskResponse risk,
        List<PlannerTaskResponse> tasks
) {}
