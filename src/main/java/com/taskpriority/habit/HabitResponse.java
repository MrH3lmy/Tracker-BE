package com.taskpriority.habit;

import com.taskpriority.model.Area;
import com.taskpriority.model.RecurrenceRule;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.MonthDay;
import java.util.List;

public record HabitResponse(
        Long id,
        String title,
        String description,
        Area area,
        boolean important,
        Integer estimatedMinutes,
        int dailyTargetCount,
        boolean reminderEnabled,
        LocalTime reminderTime,
        LocalDateTime createdDate,
        int todayCheckInCount,
        boolean todayTargetMet,
        RecurrenceResponse recurrence
) {
    public record RecurrenceResponse(
            RecurrenceRule.Frequency frequency,
            int interval,
            List<DayOfWeek> daysOfWeek,
            Integer dayOfMonth,
            MonthDay annualDate,
            LocalDate nextDueDate,
            LocalDate lastCompletedDate,
            int currentStreak,
            int longestStreak
    ) {}
}
