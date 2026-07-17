package com.taskpriority.scheduler;

import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitSchedule;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskSchedule;
import com.taskpriority.planning.WorkingCalendarService;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.HabitScheduleRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TaskScheduleRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.settings.TimeWindow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ScheduleSuggestionServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 1, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

    private SettingsService settingsService;
    private WorkingCalendarService workingCalendarService;
    private TaskRepository taskRepository;
    private HabitRepository habitRepository;
    private TaskScheduleRepository taskScheduleRepository;
    private HabitScheduleRepository habitScheduleRepository;
    private TaskService taskService;
    private ScheduleSuggestionService suggestionService;

    @BeforeEach
    void setUp() {
        settingsService = mock(SettingsService.class);
        when(settingsService.getExcludedWeekdays()).thenReturn(List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));
        when(settingsService.getHolidayDates()).thenReturn(List.of());
        when(settingsService.getDefaultDailyCapacityHours()).thenReturn(6.0);
        workingCalendarService = new WorkingCalendarService(settingsService);

        taskRepository = mock(TaskRepository.class);
        habitRepository = mock(HabitRepository.class);
        taskScheduleRepository = mock(TaskScheduleRepository.class);
        habitScheduleRepository = mock(HabitScheduleRepository.class);
        taskService = mock(TaskService.class);
        doNothing().when(taskService).computeDerivedFieldsBatch(any());

        when(taskScheduleRepository.findByScheduledDate(any())).thenReturn(List.of());
        when(habitScheduleRepository.findByScheduledDate(any())).thenReturn(List.of());
        when(taskScheduleRepository.findAll()).thenReturn(List.of());
        when(habitScheduleRepository.findAll()).thenReturn(List.of());
        when(taskScheduleRepository.save(any(TaskSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(habitScheduleRepository.save(any(HabitSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        suggestionService = new ScheduleSuggestionService(settingsService, workingCalendarService, taskRepository,
                habitRepository, taskScheduleRepository, habitScheduleRepository, taskService);
    }

    private Map<DayOfWeek, TimeWindow> workingHoursNineToFive() {
        Map<DayOfWeek, TimeWindow> hours = new EnumMap<>(DayOfWeek.class);
        hours.put(DayOfWeek.MONDAY, new TimeWindow(LocalTime.of(9, 0), LocalTime.of(17, 0)));
        return hours;
    }

    private Map<DayOfWeek, TimeWindow> sleepHoursElevenToSeven() {
        Map<DayOfWeek, TimeWindow> hours = new EnumMap<>(DayOfWeek.class);
        hours.put(DayOfWeek.MONDAY, new TimeWindow(LocalTime.of(23, 0), LocalTime.of(7, 0)));
        return hours;
    }

    private Task task(Long id, Area area, Integer estimatedMinutes) {
        Task task = new Task("Task " + id);
        task.setId(id);
        task.setArea(area);
        task.setEstimatedMinutes(estimatedMinutes);
        task.setStatus(Status.NOT_STARTED);
        return task;
    }

    private Habit habit(Long id, Area area, Integer estimatedMinutes) {
        Habit habit = new Habit("Habit " + id);
        habit.setId(id);
        habit.setArea(area);
        habit.setEstimatedMinutes(estimatedMinutes);
        RecurrenceRule rule = new RecurrenceRule();
        rule.setFrequency(RecurrenceRule.Frequency.DAILY);
        habit.setRecurrenceRule(rule);
        return habit;
    }

    @Test
    void suggestsFirstSlotWithinWorkingHoursForWorkAreaTask() {
        when(settingsService.getWorkingHours()).thenReturn(workingHoursNineToFive());
        when(settingsService.getSleepHours()).thenReturn(sleepHoursElevenToSeven());
        Task workTask = task(1L, Area.WORK, 30);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(workTask));

        Optional<SuggestedSlot> slot = suggestionService.suggestForTask(1L, MONDAY);

        assertTrue(slot.isPresent());
        assertEquals(MONDAY, slot.get().scheduledDate());
        assertEquals(LocalTime.of(9, 0), slot.get().startTime());
    }

    @Test
    void suggestsWakingHoursSlotForNonWorkAreaHabit() {
        when(settingsService.getWorkingHours()).thenReturn(workingHoursNineToFive());
        when(settingsService.getSleepHours()).thenReturn(sleepHoursElevenToSeven());
        Habit personalHabit = habit(2L, Area.PERSONAL, 15);
        when(habitRepository.findById(2L)).thenReturn(Optional.of(personalHabit));

        Optional<SuggestedSlot> slot = suggestionService.suggestForHabit(2L, MONDAY);

        assertTrue(slot.isPresent());
        assertEquals(MONDAY, slot.get().scheduledDate());
        // Sleep is 23:00-07:00 (crosses midnight) so waking hours start right at 07:00.
        assertEquals(LocalTime.of(7, 0), slot.get().startTime());
    }

    @Test
    void skipsToNextAvailableGapWhenEarlierSlotIsAlreadyBooked() {
        when(settingsService.getWorkingHours()).thenReturn(workingHoursNineToFive());
        when(settingsService.getSleepHours()).thenReturn(sleepHoursElevenToSeven());
        Task workTask = task(3L, Area.WORK, 30);
        when(taskRepository.findById(3L)).thenReturn(Optional.of(workTask));

        TaskSchedule existing = new TaskSchedule();
        Task existingTask = task(99L, Area.WORK, 30);
        existing.setTask(existingTask);
        existing.setStartTime(LocalTime.of(9, 0));
        existing.setDurationMinutes(30);
        when(taskScheduleRepository.findByScheduledDate(MONDAY)).thenReturn(List.of(existing));

        Optional<SuggestedSlot> slot = suggestionService.suggestForTask(3L, MONDAY);

        assertTrue(slot.isPresent());
        assertEquals(LocalTime.of(9, 30), slot.get().startTime());
    }

    @Test
    void autoScheduleDoesNotDoubleBookTwoCandidatesOnTheSameDay() {
        when(settingsService.getWorkingHours()).thenReturn(workingHoursNineToFive());
        when(settingsService.getSleepHours()).thenReturn(sleepHoursElevenToSeven());

        Task first = task(10L, Area.WORK, 60);
        Task second = task(11L, Area.WORK, 60);
        first.setPriorityScore(50);
        second.setPriorityScore(40);
        when(taskRepository.findAll()).thenReturn(List.of(first, second));
        when(habitRepository.findAll()).thenReturn(List.of());

        AutoScheduleResult result = suggestionService.autoSchedule(MONDAY, MONDAY, AutoScheduleScope.TASKS_ONLY);

        assertEquals(List.of(10L, 11L), result.scheduledTaskIds());
        assertTrue(result.unresolvedTaskIds().isEmpty());

        org.mockito.ArgumentCaptor<TaskSchedule> captor = org.mockito.ArgumentCaptor.forClass(TaskSchedule.class);
        verify(taskScheduleRepository, times(2)).save(captor.capture());
        List<TaskSchedule> saved = captor.getAllValues();
        LocalTime firstStart = saved.get(0).getStartTime();
        LocalTime secondStart = saved.get(1).getStartTime();
        assertNotEquals(firstStart, secondStart);
        // The two 60-minute bookings must not overlap.
        LocalTime firstEnd = firstStart.plusMinutes(saved.get(0).getDurationMinutes());
        assertFalse(firstStart.isBefore(secondStart) && firstEnd.isAfter(secondStart) && firstStart.equals(secondStart));
        boolean overlap = firstStart.isBefore(secondStart.plusMinutes(saved.get(1).getDurationMinutes())) && secondStart.isBefore(firstEnd);
        assertFalse(overlap);
    }
}
