package com.taskpriority.planning;

import com.taskpriority.task.api.TaskResponse;

import java.util.List;

public record TaskRecommendationResponse(
        TaskResponse task,
        String recommendedAction,
        List<String> reasonCodes,
        String explanation,
        double confidence,
        List<String> blockerWarnings,
        int rank
) {}
