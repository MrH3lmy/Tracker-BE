package com.taskpriority.habit;

import com.taskpriority.common.exception.ResourceNotFoundException;
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
    void checkInSucceedsWhenHabitHasNoRecurrenceRule() {
        Habit habit = new Habit("No recurrence");
        habit.setId(70L);
        habit.setDailyTargetCount(1);
        when(habitRepository.findById(70L)).thenReturn(Optional.of(habit));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(70L), any(LocalDate.class))).thenReturn(1);

        Habit result = habitService.checkIn(70L);

        assertNull(result.getRecurrenceRule());
        assertTrue(result.isTodayTargetMet());
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
    void saveAppliesTodayProgressAfterPersisting() {
        Habit habit = recurringHabit(10L, 2);
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(10L), any(LocalDate.class))).thenReturn(1);

        Habit result = habitService.save(habit);

        assertEquals(1, result.getTodayCheckInCount());
        assertFalse(result.isTodayTargetMet());
        verify(habitRepository).save(habit);
    }

    @Test
    void saveSkipsCheckInLookupWhenPersistedHabitHasNoIdYet() {
        Habit unpersisted = new Habit("Not yet saved");
        when(habitRepository.save(any(Habit.class))).thenReturn(unpersisted);

        Habit result = habitService.save(unpersisted);

        assertEquals(0, result.getTodayCheckInCount());
        assertFalse(result.isTodayTargetMet());
        verify(habitCheckInRepository, never()).countByHabitIdAndCheckInDate(any(), any());
    }

    @Test
    void updateHabitDelegatesToSave() {
        Habit habit = recurringHabit(11L, 1);
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(11L), any(LocalDate.class))).thenReturn(0);

        Habit result = habitService.updateHabit(11L, habit);

        assertSame(habit, result);
        verify(habitRepository).save(habit);
    }

    @Test
    void findAllExcludesDeletedHabitsAndAppliesBatchProgress() {
        Habit active = recurringHabit(20L, 1);
        Habit deleted = recurringHabit(21L, 1);
        deleted.setDeleted(true);
        when(habitRepository.findAll()).thenReturn(List.of(active, deleted));
        when(habitCheckInRepository.countByHabitIdInAndCheckInDate(eq(List.of(20L)), any(LocalDate.class)))
                .thenReturn(List.of());

        List<Habit> result = habitService.findAll();

        assertEquals(List.of(active), result);
        verify(habitCheckInRepository).countByHabitIdInAndCheckInDate(eq(List.of(20L)), any(LocalDate.class));
    }

    @Test
    void findByIdReturnsHabitWithTodayProgressApplied() {
        Habit habit = recurringHabit(30L, 4);
        when(habitRepository.findById(30L)).thenReturn(Optional.of(habit));
        when(habitCheckInRepository.countByHabitIdAndCheckInDate(eq(30L), any(LocalDate.class))).thenReturn(4);

        Habit result = habitService.findById(30L);

        assertEquals(4, result.getTodayCheckInCount());
        assertTrue(result.isTodayTargetMet());
    }

    @Test
    void findByIdThrowsWhenHabitMissing() {
        when(habitRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> habitService.findById(99L));
    }

    @Test
    void deleteDelegatesToRepository() {
        habitService.delete(40L);

        verify(habitRepository).deleteById(40L);
    }

    @Test
    void checkInThrowsWhenHabitMissing() {
        when(habitRepository.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> habitService.checkIn(50L));
    }

    @Test
    void undoCheckInThrowsWhenHabitMissing() {
        when(habitRepository.findById(51L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> habitService.undoCheckIn(51L));
    }

    @Test
    void applyTodayProgressBatchReturnsEarlyWhenAllHabitsLackIds() {
        Habit unpersisted = new Habit("Not saved");

        habitService.applyTodayProgressBatch(List.of(unpersisted));

        assertEquals(0, unpersisted.getTodayCheckInCount());
        verifyNoInteractions(habitCheckInRepository);
    }

    @Test
    void applyTodayProgressBatchSkipsHabitsWithNullId() {
        Habit withId = recurringHabit(60L, 1);
        Habit withoutId = new Habit("Not saved");
        withoutId.setDailyTargetCount(0); // would trivially satisfy targetMet if the null-id guard were removed
        when(habitCheckInRepository.countByHabitIdInAndCheckInDate(eq(List.of(60L)), any(LocalDate.class)))
                .thenReturn(List.of());

        habitService.applyTodayProgressBatch(List.of(withId, withoutId));

        verify(habitCheckInRepository).countByHabitIdInAndCheckInDate(eq(List.of(60L)), any(LocalDate.class));
        assertFalse(withoutId.isTodayTargetMet());
    }

    @Test
    void historyExcludesDeletedHabitsAndQueriesActiveIdsOnly() {
        Habit active = recurringHabit(8L, 1);
        Habit deleted = recurringHabit(9L, 1);
        deleted.setDeleted(true);
        when(habitRepository.findAll()).thenReturn(List.of(active, deleted));
        LocalDate from = LocalDate.now().minusDays(6);
        LocalDate to = LocalDate.now();
        when(habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(eq(List.of(8L)), eq(from), eq(to)))
                .thenReturn(List.of());

        habitService.history(from, to);

        verify(habitCheckInRepository).countByHabitIdInAndCheckInDateBetween(eq(List.of(8L)), eq(from), eq(to));
    }

    @Test
    void historyReturnsEmptyListWhenNoActiveHabits() {
        when(habitRepository.findAll()).thenReturn(List.of());

        List<HabitCheckInRepository.HabitCheckInDailyCount> result = habitService.history(LocalDate.now().minusDays(6), LocalDate.now());

        assertTrue(result.isEmpty());
        verify(habitCheckInRepository, org.mockito.Mockito.never()).countByHabitIdInAndCheckInDateBetween(any(), any(), any());
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
