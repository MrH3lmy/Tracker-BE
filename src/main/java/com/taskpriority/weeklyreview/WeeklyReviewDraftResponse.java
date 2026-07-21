package com.taskpriority.weeklyreview;

import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public record WeeklyReviewDraftResponse(
        LocalDate weekStartDate,
        LocalDate weekEndDate,
        List<TaskResponse> completedTasks,
        List<TaskResponse> overdueTasks,
        List<TaskResponse> blockedOrWaitingTasks,
        List<HabitPerformanceResponse> habitPerformance,
        List<ProjectAtRiskResponse> projectsAtRisk,
        List<TaskResponse> staleTasks
) {}
