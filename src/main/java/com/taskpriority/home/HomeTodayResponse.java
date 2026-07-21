package com.taskpriority.home;

import com.taskpriority.habit.HabitResponse;
import com.taskpriority.planning.TaskRecommendationResponse;
import com.taskpriority.scheduler.ScheduledEntryResponse;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public record HomeTodayResponse(
        LocalDate date,
        TaskService.DashboardSummary summary,
        List<TaskResponse> dueToday,
        List<TaskResponse> overdue,
        List<TaskRecommendationResponse> topRecommendations,
        List<ScheduledEntryResponse> todayTimeline,
        int scheduledFocusMinutes,
        List<HabitResponse> habitsToday,
        int habitsCompletedToday,
        int habitsTotalToday,
        List<TaskResponse> upcomingTasks,
        List<TaskResponse> waitingOrBlocked,
        List<TaskResponse> followUpsDue
) {
}
