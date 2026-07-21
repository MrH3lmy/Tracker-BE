package com.taskpriority.weeklyreview;

public record HabitPerformanceResponse(
        Long habitId,
        String title,
        int checkIns,
        int target,
        int percent
) {}
