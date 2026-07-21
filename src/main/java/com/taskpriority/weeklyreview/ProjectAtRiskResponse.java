package com.taskpriority.weeklyreview;

public record ProjectAtRiskResponse(
        Long projectId,
        String name,
        String riskLevel,
        String riskReason,
        int progressPercent
) {}
