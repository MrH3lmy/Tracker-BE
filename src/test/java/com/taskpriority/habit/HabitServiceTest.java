package com.taskpriority.habit;

import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitCheckIn;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.HabitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class HabitServiceTest {

    private HabitRepository habitRepository;
    private HabitCheckInRepository habitCheckInRepository;
    private HabitService habitService;

    @BeforeEach
    void setUp() {
        habitRepository = mock(HabitRepository.class);
        habitCheckInRepository = mock(HabitCheckInRepository.class);
        habitService = new HabitService(habitRepository, habitCheckInRepository);
        when(habitRepository.save(any(Habit.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Habit recurringHabit(Long id, int dailyTargetCount) {
        Habit habit = new Habit("Drink water");
        habit.setId(id);
        habit.setDailyTargetCount(dailyTargetCount);
        RecurrenceRule rule = new RecurrenceRule();
        rule.setFrequency(RecurrenceRule.Frequency.DAILY);
        rule.setInterval(1);
        habit.setRecurrenceRule(rule);
        return habit;
    }

    @Test
    void checkInBelowTargetDoesNotAdvanceRecurrence() {
        Habit habit = recurringHabit(1L, 8);
        LocalDate previousDueDate = LocalDate.now().plusDays(1);
        habit.getRecurrenceRule().setNextDueDate(previousDueDate);
        when(habitRepository.findById(1L)).thenReturn(Optional.of(habit));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(1L), any(LocalDate.class))).thenReturn(3);

        Habit result = habitService.checkIn(1L);

        assertEquals(previousDueDate, result.getRecurrenceRule().getNextDueDate());
        assertEquals(3, result.getTodayCheckInCount());
        assertFalse(result.isTodayTargetMet());
    }

    @Test
    void checkInCrossingTargetAdvancesNextDueDateAndStreakExactlyOnce() {
        Habit habit = recurringHabit(2L, 8);
        LocalDate today = LocalDate.now();
        habit.getRecurrenceRule().setNextDueDate(today);
        when(habitRepository.findById(2L)).thenReturn(Optional.of(habit));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(2L), any(LocalDate.class))).thenReturn(8);

        Habit result = habitService.checkIn(2L);

        assertEquals(today.plusDays(1), result.getRecurrenceRule().getNextDueDate());
        assertEquals(today, result.getRecurrenceRule().getLastCompletedDate());
        assertEquals(1, result.getRecurrenceRule().getCurrentStreak());
        assertTrue(result.isTodayTargetMet());
    }

    @Test
    void checkInPastTargetDoesNotReAdvanceRecurrenceOnceAlreadyRolledOverToday() {
        Habit habit = recurringHabit(3L, 8);
        LocalDate today = LocalDate.now();
        habit.getRecurrenceRule().setLastCompletedDate(today);
        habit.getRecurrenceRule().setNextDueDate(today.plusDays(1));
        when(habitRepository.findById(3L)).thenReturn(Optional.of(habit));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(3L), any(LocalDate.class))).thenReturn(9);

        Habit result = habitService.checkIn(3L);

        assertEquals(today.plusDays(1), result.getRecurrenceRule().getNextDueDate());
    }

    @Test
    void undoCheckInDeletesMostRecentCheckInForToday() {
        Habit habit = recurringHabit(5L, 1);
        when(habitRepository.findById(5L)).thenReturn(Optional.of(habit));
        HabitCheckIn latest = new HabitCheckIn();
        when(habitCheckInRepository.findTopByHabitIdAndCheckInDateOrderByCheckedInAtDesc(eq(5L), any(LocalDate.class)))
                .thenReturn(Optional.of(latest));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(5L), any(LocalDate.class))).thenReturn(0);

        habitService.undoCheckIn(5L);

        verify(habitCheckInRepository).delete(latest);
    }

    @Test
    void applyTodayProgressBatchPopulatesCountsFromGroupedQuery() {
        Habit habitA = recurringHabit(6L, 2);
        Habit habitB = recurringHabit(7L, 2);
        HabitCheckInRepository.HabitCheckInCount rowA = mock(HabitCheckInRepository.HabitCheckInCount.class);
        when(rowA.getHabitId()).thenReturn(6L);
        when(rowA.getCheckInCount()).thenReturn(2L);
        when(habitCheckInRepository.countByHabitIdInAndCheckInDate(eq(List.of(6L, 7L)), any(LocalDate.class)))
                .thenReturn(List.of(rowA));

        habitService.applyTodayProgressBatch(List.of(habitA, habitB));

        assertEquals(2, habitA.getTodayCheckInCount());
        assertTrue(habitA.isTodayTargetMet());
        assertEquals(0, habitB.getTodayCheckInCount());
        assertFalse(habitB.isTodayTargetMet());
    }
}
