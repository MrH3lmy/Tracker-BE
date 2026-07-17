package com.taskpriority.scheduler;

import com.taskpriority.habit.HabitResponse;
import com.taskpriority.model.SchedulePriority;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ScheduledHabitResponse(
        Long habitId,
        HabitResponse habit,
        LocalDate scheduledDate,
        LocalTime startTime,
        LocalTime endTime,
        int durationMinutes,
        SchedulePriority priorityLevel,
        List<Long> overlapsWithHabitIds
) {
}
