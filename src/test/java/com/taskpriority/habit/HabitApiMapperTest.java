package com.taskpriority.habit;

import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.RecurrenceRule;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HabitApiMapperTest {

    private final HabitApiMapper mapper = new HabitApiMapper();

    private CreateHabitRequest.HabitRecurrenceRequest weeklyRecurrence() {
        return new CreateHabitRequest.HabitRecurrenceRequest(
                RecurrenceRule.Frequency.WEEKLY, 1, List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), null, null);
    }

    @Test
    void fromCreateRequestMapsAllFieldsOntoNewHabit() {
        CreateHabitRequest request = new CreateHabitRequest(
                "Drink water", "8 glasses", Area.HEALTH, true, 15, 8,
                true, LocalTime.of(9, 30), weeklyRecurrence());

        Habit habit = mapper.fromCreateRequest(request);

        assertEquals("Drink water", habit.getTitle());
        assertEquals("8 glasses", habit.getDescription());
        assertEquals(Area.HEALTH, habit.getArea());
        assertTrue(habit.isImportant());
        assertEquals(15, habit.getEstimatedMinutes());
        assertEquals(8, habit.getDailyTargetCount());
        assertTrue(habit.isReminderEnabled());
        assertEquals(LocalTime.of(9, 30), habit.getReminderTime());
        assertNotNull(habit.getRecurrenceRule());
        assertEquals(RecurrenceRule.Frequency.WEEKLY, habit.getRecurrenceRule().getFrequency());
        assertEquals(List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), habit.getRecurrenceRule().getDaysOfWeek());
    }

    @Test
    void fromCreateRequestKeepsDefaultAreaAndTargetWhenNotProvided() {
        CreateHabitRequest request = new CreateHabitRequest(
                "Meditate", null, null, false, null, null,
                false, null, weeklyRecurrence());

        Habit habit = mapper.fromCreateRequest(request);

        assertEquals(Area.PERSONAL, habit.getArea());
        assertEquals(1, habit.getDailyTargetCount());
    }

    @Test
    void fromCreateRequestClearsReminderTimeWhenReminderDisabled() {
        CreateHabitRequest request = new CreateHabitRequest(
                "Read", null, Area.PERSONAL, false, null, null,
                false, LocalTime.of(7, 0), weeklyRecurrence());

        Habit habit = mapper.fromCreateRequest(request);

        assertFalse(habit.isReminderEnabled());
        assertNull(habit.getReminderTime());
    }

    @Test
    void applyUpdateRequestReusesExistingRecurrenceRuleInstance() {
        Habit existing = new Habit("Old title");
        RecurrenceRule originalRule = new RecurrenceRule(RecurrenceRule.Frequency.DAILY, 1);
        originalRule.setCurrentStreak(5);
        existing.setRecurrenceRule(originalRule);

        UpdateHabitRequest request = new UpdateHabitRequest(
                "New title", "New description", Area.WORK, true, 20, 1,
                false, null, weeklyRecurrence());

        mapper.applyUpdateRequest(existing, request);

        assertEquals("New title", existing.getTitle());
        assertEquals("New description", existing.getDescription());
        assertEquals(Area.WORK, existing.getArea());
        assertSame(originalRule, existing.getRecurrenceRule());
        assertEquals(RecurrenceRule.Frequency.WEEKLY, existing.getRecurrenceRule().getFrequency());
        assertEquals(5, existing.getRecurrenceRule().getCurrentStreak());
    }

    @Test
    void applyUpdateRequestCreatesRecurrenceRuleWhenHabitHasNone() {
        Habit existing = new Habit("Habit without recurrence");

        UpdateHabitRequest request = new UpdateHabitRequest(
                "Habit without recurrence", null, Area.PERSONAL, false, null, null,
                false, null, weeklyRecurrence());

        mapper.applyUpdateRequest(existing, request);

        assertNotNull(existing.getRecurrenceRule());
        assertEquals(RecurrenceRule.Frequency.WEEKLY, existing.getRecurrenceRule().getFrequency());
    }

    @Test
    void toResponseMapsHabitAndRecurrenceRule() {
        Habit habit = new Habit("Drink water");
        habit.setId(42L);
        habit.setDescription("desc");
        habit.setArea(Area.HEALTH);
        habit.setImportant(true);
        habit.setEstimatedMinutes(10);
        habit.setDailyTargetCount(8);
        habit.setReminderEnabled(true);
        habit.setReminderTime(LocalTime.of(9, 30));
        habit.setTodayCheckInCount(3);
        habit.setTodayTargetMet(false);
        RecurrenceRule rule = new RecurrenceRule(RecurrenceRule.Frequency.MONTHLY, 1);
        rule.setDayOfMonth(15);
        rule.setCurrentStreak(4);
        rule.setLongestStreak(12);
        habit.setRecurrenceRule(rule);

        HabitResponse response = mapper.toResponse(habit);

        assertEquals(42L, response.id());
        assertEquals("Drink water", response.title());
        assertEquals("desc", response.description());
        assertEquals(Area.HEALTH, response.area());
        assertTrue(response.important());
        assertEquals(10, response.estimatedMinutes());
        assertEquals(8, response.dailyTargetCount());
        assertTrue(response.reminderEnabled());
        assertEquals(LocalTime.of(9, 30), response.reminderTime());
        assertEquals(3, response.todayCheckInCount());
        assertFalse(response.todayTargetMet());
        assertNotNull(response.recurrence());
        assertEquals(RecurrenceRule.Frequency.MONTHLY, response.recurrence().frequency());
        assertEquals(15, response.recurrence().dayOfMonth());
        assertEquals(4, response.recurrence().currentStreak());
        assertEquals(12, response.recurrence().longestStreak());
    }

    @Test
    void toResponseReturnsNullRecurrenceWhenHabitHasNoRule() {
        Habit habit = new Habit("No recurrence");
        habit.setId(1L);

        HabitResponse response = mapper.toResponse(habit);

        assertNull(response.recurrence());
    }
}
