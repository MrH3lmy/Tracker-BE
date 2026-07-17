package com.taskpriority.scheduler;

import com.taskpriority.model.SchedulePriority;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.time.LocalTime;

public record ScheduleHabitRequest(
        @NotNull(message = "scheduledDate is required")
        LocalDate scheduledDate,
        @NotNull(message = "startTime is required")
        LocalTime startTime,
        @Positive(message = "durationMinutes must be greater than 0")
        Integer durationMinutes,
        SchedulePriority priorityLevel
) {
}
