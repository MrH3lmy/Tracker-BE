package com.taskpriority.scheduler;

import com.taskpriority.habit.HabitResponse;
import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public record DayScheduleResponse(
        LocalDate date,
        List<ScheduledEntryResponse> scheduled,
        List<TaskResponse> unscheduledTasks,
        List<HabitResponse> unscheduledHabits
) {
}
