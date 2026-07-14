package com.taskpriority.task.application;

import com.taskpriority.model.HabitCheckIn;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.TaskRepository;
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

    private TaskRepository taskRepository;
    private HabitCheckInRepository habitCheckInRepository;
    private RecurrenceService recurrenceService;
    private HabitService habitService;

    @BeforeEach
    void setUp() {
        taskRepository = mock(TaskRepository.class);
        habitCheckInRepository = mock(HabitCheckInRepository.class);
        recurrenceService = mock(RecurrenceService.class);
        habitService = new HabitService(taskRepository, habitCheckInRepository, recurrenceService);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Task recurringHabit(Long id, int dailyTargetCount) {
        Task task = new Task("Drink water");
        task.setId(id);
        task.setStatus(Status.NOT_STARTED);
        task.setDailyTargetCount(dailyTargetCount);
        RecurrenceRule rule = new RecurrenceRule();
        rule.setFrequency(RecurrenceRule.Frequency.DAILY);
        rule.setInterval(1);
        task.setRecurrenceRule(rule);
        return task;
    }

    @Test
    void checkInBelowTargetDoesNotTriggerRollover() {
        Task task = recurringHabit(1L, 8);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(habitCheckInRepository.countByTaskIdAndCheckInDate(eq(1L), any(LocalDate.class))).thenReturn(3);

        Task result = habitService.checkIn(1L);

        verify(recurrenceService, never()).completeRecurringTask(any(), any());
        assertEquals(3, result.getTodayCheckInCount());
        assertFalse(result.isTodayTargetMet());
    }

    @Test
    void checkInCrossingTargetTriggersRolloverExactlyOnce() {
        Task task = recurringHabit(2L, 8);
        when(taskRepository.findById(2L)).thenReturn(Optional.of(task));
        when(habitCheckInRepository.countByTaskIdAndCheckInDate(eq(2L), any(LocalDate.class))).thenReturn(8);

        habitService.checkIn(2L);

        verify(recurrenceService, times(1)).completeRecurringTask(eq(task), any(LocalDate.class));
    }

    @Test
    void checkInPastTargetDoesNotReTriggerRolloverOnceAlreadyRolledOverToday() {
        Task task = recurringHabit(3L, 8);
        task.getRecurrenceRule().setLastCompletedDate(LocalDate.now());
        when(taskRepository.findById(3L)).thenReturn(Optional.of(task));
        when(habitCheckInRepository.countByTaskIdAndCheckInDate(eq(3L), any(LocalDate.class))).thenReturn(9);

        habitService.checkIn(3L);

        verify(recurrenceService, never()).completeRecurringTask(any(), any());
    }

    @Test
    void checkInWithoutRecurrenceMarksSimpleTaskDoneOnceTargetMet() {
        Task task = new Task("One-off habit");
        task.setId(4L);
        task.setStatus(Status.NOT_STARTED);
        when(taskRepository.findById(4L)).thenReturn(Optional.of(task));
        when(habitCheckInRepository.countByTaskIdAndCheckInDate(eq(4L), any(LocalDate.class))).thenReturn(1);

        Task result = habitService.checkIn(4L);

        assertEquals(Status.DONE, result.getStatus());
        assertNotNull(result.getCompletedDate());
    }

    @Test
    void undoCheckInDeletesMostRecentCheckInForToday() {
        Task task = recurringHabit(5L, 1);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task));
        HabitCheckIn latest = new HabitCheckIn();
        when(habitCheckInRepository.findTopByTaskIdAndCheckInDateOrderByCheckedInAtDesc(eq(5L), any(LocalDate.class)))
                .thenReturn(Optional.of(latest));
        when(habitCheckInRepository.countByTaskIdAndCheckInDate(eq(5L), any(LocalDate.class))).thenReturn(0);

        habitService.undoCheckIn(5L);

        verify(habitCheckInRepository).delete(latest);
    }

    @Test
    void applyTodayProgressBatchPopulatesCountsFromGroupedQuery() {
        Task taskA = recurringHabit(6L, 2);
        Task taskB = recurringHabit(7L, 2);
        HabitCheckInRepository.TaskCheckInCount rowA = mock(HabitCheckInRepository.TaskCheckInCount.class);
        when(rowA.getTaskId()).thenReturn(6L);
        when(rowA.getCheckInCount()).thenReturn(2L);
        when(habitCheckInRepository.countByTaskIdInAndCheckInDate(eq(List.of(6L, 7L)), any(LocalDate.class)))
                .thenReturn(List.of(rowA));

        habitService.applyTodayProgressBatch(List.of(taskA, taskB));

        assertEquals(2, taskA.getTodayCheckInCount());
        assertTrue(taskA.isTodayTargetMet());
        assertEquals(0, taskB.getTodayCheckInCount());
        assertFalse(taskB.isTodayTargetMet());
    }
}
