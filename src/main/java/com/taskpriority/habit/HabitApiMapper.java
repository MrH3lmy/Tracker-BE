package com.taskpriority.habit;

import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.RecurrenceRule;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

@Component
public class HabitApiMapper {

    public Habit fromCreateRequest(CreateHabitRequest request) {
        Habit habit = new Habit();
        applyCommonFields(habit, request.title(), request.description(), request.area(), request.important(),
                request.estimatedMinutes(), request.dailyTargetCount(), request.reminderEnabled(), request.reminderTime(),
                request.recurrence());
        return habit;
    }

    public void applyUpdateRequest(Habit existing, UpdateHabitRequest request) {
        applyCommonFields(existing, request.title(), request.description(), request.area(), request.important(),
                request.estimatedMinutes(), request.dailyTargetCount(), request.reminderEnabled(), request.reminderTime(),
                request.recurrence());
    }

    public HabitResponse toResponse(Habit habit) {
        return new HabitResponse(
                habit.getId(),
                habit.getTitle(),
                habit.getDescription(),
                habit.getArea(),
                habit.isImportant(),
                habit.getEstimatedMinutes(),
                habit.getDailyTargetCount(),
                habit.isReminderEnabled(),
                habit.getReminderTime(),
                habit.getCreatedDate(),
                habit.getTodayCheckInCount(),
                habit.isTodayTargetMet(),
                toRecurrenceResponse(habit.getRecurrenceRule())
        );
    }

    private HabitResponse.RecurrenceResponse toRecurrenceResponse(RecurrenceRule rule) {
        if (rule == null) {
            return null;
        }
        return new HabitResponse.RecurrenceResponse(
                rule.getFrequency(),
                rule.getInterval(),
                rule.getDaysOfWeek(),
                rule.getDayOfMonth(),
                rule.getAnnualDate(),
                rule.getNextDueDate(),
                rule.getLastCompletedDate(),
                rule.getCurrentStreak(),
                rule.getLongestStreak()
        );
    }

    private void applyCommonFields(Habit habit, String title, String description, Area area, boolean important,
                                    Integer estimatedMinutes, Integer dailyTargetCount,
                                    boolean reminderEnabled, LocalTime reminderTime,
                                    CreateHabitRequest.HabitRecurrenceRequest recurrence) {
        habit.setTitle(title);
        habit.setDescription(description);
        if (area != null) habit.setArea(area);
        habit.setImportant(important);
        habit.setEstimatedMinutes(estimatedMinutes);
        if (dailyTargetCount != null) habit.setDailyTargetCount(dailyTargetCount);
        habit.setReminderEnabled(reminderEnabled);
        habit.setReminderTime(reminderEnabled ? reminderTime : null);

        RecurrenceRule recurrenceRule = habit.getRecurrenceRule() != null ? habit.getRecurrenceRule() : new RecurrenceRule();
        recurrenceRule.setFrequency(recurrence.frequency());
        recurrenceRule.setInterval(recurrence.interval());
        recurrenceRule.setDaysOfWeek(recurrence.daysOfWeek());
        recurrenceRule.setDayOfMonth(recurrence.dayOfMonth());
        recurrenceRule.setAnnualDate(recurrence.annualDate());
        habit.setRecurrenceRule(recurrenceRule);
    }
}
