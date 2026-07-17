package com.taskpriority.habit;

import com.taskpriority.model.Area;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record UpdateHabitRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,
        String description,
        Area area,
        boolean important,
        @PositiveOrZero(message = "estimatedMinutes must be greater than or equal to 0")
        Integer estimatedMinutes,
        @Positive(message = "dailyTargetCount must be greater than 0")
        Integer dailyTargetCount,
        boolean reminderEnabled,
        LocalTime reminderTime,
        @NotNull(message = "recurrence is required for a habit")
        @Valid CreateHabitRequest.HabitRecurrenceRequest recurrence
) {
    @AssertTrue(message = "reminderTime is required when reminderEnabled is true")
    boolean isReminderValid() { return !reminderEnabled || reminderTime != null; }
}
