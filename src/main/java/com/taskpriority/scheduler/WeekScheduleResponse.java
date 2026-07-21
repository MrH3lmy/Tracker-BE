package com.taskpriority.scheduler;

import com.taskpriority.habit.HabitResponse;
import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public record WeekScheduleResponse(
        LocalDate startDate,
        List<DayEntries> days,
        List<TaskResponse> unscheduledTasks,
        List<HabitResponse> unscheduledHabits
) {
    public record DayEntries(LocalDate date, List<ScheduledEntryResponse> scheduled) {
    }
}
