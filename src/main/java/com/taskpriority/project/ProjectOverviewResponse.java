package com.taskpriority.project;

import java.util.List;

public record ProjectOverviewResponse(
        ProjectResponse project,
        int totalTasks,
        int completedTasks,
        int activeTasks,
        int overdueTasks,
        int progressPercent,
        double estimatedHours,
        double actualHours,
        List<MilestoneResponse> milestones,
        int completedMilestones,
        String riskLevel,
        String riskReason
) {
}
