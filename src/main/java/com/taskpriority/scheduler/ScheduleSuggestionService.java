package com.taskpriority.scheduler;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitSchedule;
import com.taskpriority.model.SchedulePriority;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Suggests free time slots for unscheduled tasks/habits, respecting configured working hours
 * (for Work/Study-area items) or sleep hours (waking hours, for everything else), plus existing
 * excluded weekdays/holidays and already-booked schedule slots.
 *
 * Sleep-hours entries are applied directly to the calendar day they're keyed under (a MONDAY entry
 * of 23:00-07:00 excludes both the late-night tail and the early-morning head of Monday itself,
 * rather than being attributed to the Sunday-to-Monday overnight span) - this keeps the model
 * simple and is equivalent to the "correct" cross-night behavior whenever the same window repeats
 * every day, which is the common case.
 */
@Service
public class ScheduleSuggestionService {
    private static final int MINUTES_PER_DAY = 24 * 60;
    private static final int SEARCH_HORIZON_DAYS = 30;

    private final SettingsService settingsService;
    private final WorkingCalendarService workingCalendarService;
    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final TaskScheduleRepository taskScheduleRepository;
    private final HabitScheduleRepository habitScheduleRepository;
    private final TaskService taskService;
    private final CurrentUserService currentUserService;

    public ScheduleSuggestionService(SettingsService settingsService, WorkingCalendarService workingCalendarService,
                                      TaskRepository taskRepository, HabitRepository habitRepository,
                                      TaskScheduleRepository taskScheduleRepository, HabitScheduleRepository habitScheduleRepository,
                                      TaskService taskService, CurrentUserService currentUserService) {
        this.settingsService = settingsService;
        this.workingCalendarService = workingCalendarService;
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.taskScheduleRepository = taskScheduleRepository;
        this.habitScheduleRepository = habitScheduleRepository;
        this.taskService = taskService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public Optional<SuggestedSlot> suggestForTask(Long taskId, LocalDate earliestDate) {
        Long userId = currentUserService.requireUserId();
        Task task = taskRepository.findByUserIdAndId(userId, taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + taskId + " not found"));
        LocalDate start = earliestDate != null ? earliestDate : LocalDate.now();
        int duration = task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : SchedulerService.DEFAULT_DURATION_MINUTES;
        return findSlot(task.getArea(), duration, start, start.plusDays(SEARCH_HORIZON_DAYS), Map.of());
    }

    @Transactional(readOnly = true)
    public Optional<SuggestedSlot> suggestForHabit(Long habitId, LocalDate earliestDate) {
        Long userId = currentUserService.requireUserId();
        Habit habit = habitRepository.findByUserIdAndId(userId, habitId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit with id " + habitId + " not found"));
        LocalDate start = earliestDate != null ? earliestDate : LocalDate.now();
        int duration = habit.getEstimatedMinutes() != null ? habit.getEstimatedMinutes() : SchedulerService.DEFAULT_DURATION_MINUTES;
        return findSlot(habit.getArea(), duration, start, start.plusDays(SEARCH_HORIZON_DAYS), Map.of());
    }

    @Transactional
    public AutoScheduleResult autoSchedule(LocalDate startDate, LocalDate endDate, AutoScheduleScope scope) {
        List<Long> scheduledTaskIds = new ArrayList<>();
        List<Long> scheduledHabitIds = new ArrayList<>();
        List<Long> unresolvedTaskIds = new ArrayList<>();
        List<Long> unresolvedHabitIds = new ArrayList<>();
        Map<LocalDate, List<int[]>> placedThisRun = new HashMap<>();

        if (scope != AutoScheduleScope.HABITS_ONLY) {
            for (Task task : candidateTasks()) {
                int duration = task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : SchedulerService.DEFAULT_DURATION_MINUTES;
                Optional<SuggestedSlot> slot = findSlot(task.getArea(), duration, startDate, endDate, placedThisRun);
                if (slot.isEmpty()) {
                    unresolvedTaskIds.add(task.getId());
                    continue;
                }
                persistTaskSlot(task, slot.get());
                addPlacement(placedThisRun, slot.get());
                scheduledTaskIds.add(task.getId());
            }
        }

        if (scope != AutoScheduleScope.TASKS_ONLY) {
            for (Habit habit : candidateHabits()) {
                int duration = habit.getEstimatedMinutes() != null ? habit.getEstimatedMinutes() : SchedulerService.DEFAULT_DURATION_MINUTES;
                Optional<SuggestedSlot> slot = findSlot(habit.getArea(), duration, startDate, endDate, placedThisRun);
                if (slot.isEmpty()) {
                    unresolvedHabitIds.add(habit.getId());
                    continue;
                }
                persistHabitSlot(habit, slot.get());
                addPlacement(placedThisRun, slot.get());
                scheduledHabitIds.add(habit.getId());
            }
        }

        return new AutoScheduleResult(scheduledTaskIds, scheduledHabitIds, unresolvedTaskIds, unresolvedHabitIds);
    }

    private List<Task> candidateTasks() {
        Long userId = currentUserService.requireUserId();
        Set<Long> scheduledIds = taskScheduleRepository.findByUserId(userId).stream()
                .map(schedule -> schedule.getTask().getId()).collect(Collectors.toSet());
        List<Task> candidates = taskRepository.findByUserId(userId).stream()
                .filter(task -> !task.isDeleted())
                .filter(task -> task.getStatus() != Status.DONE && task.getStatus() != Status.CANCELLED)
                .filter(task -> !scheduledIds.contains(task.getId()))
                .collect(Collectors.toCollection(ArrayList::new));
        taskService.computeDerivedFieldsBatch(candidates);
        return candidates.stream()
                .sorted(Comparator.comparingInt(Task::getPriorityScore).reversed()
                        .thenComparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private List<Habit> candidateHabits() {
        Long userId = currentUserService.requireUserId();
        Set<Long> scheduledIds = habitScheduleRepository.findByUserId(userId).stream()
                .map(schedule -> schedule.getHabit().getId()).collect(Collectors.toSet());
        List<Habit> candidates = habitRepository.findByUserId(userId).stream()
                .filter(habit -> !habit.isDeleted())
                .filter(habit -> !scheduledIds.contains(habit.getId()))
                .toList();
        return candidates.stream()
                .sorted(Comparator.comparing((Habit habit) -> nextDueDate(habit), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing((Habit habit) -> currentStreak(habit), Comparator.reverseOrder())
                        .thenComparing(Habit::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private LocalDate nextDueDate(Habit habit) {
        return habit.getRecurrenceRule() != null ? habit.getRecurrenceRule().getNextDueDate() : null;
    }

    private int currentStreak(Habit habit) {
        return habit.getRecurrenceRule() != null ? habit.getRecurrenceRule().getCurrentStreak() : 0;
    }

    private void persistTaskSlot(Task task, SuggestedSlot slot) {
        Long userId = currentUserService.requireUserId();
        TaskSchedule schedule = taskScheduleRepository.findByUserIdAndTaskId(userId, task.getId()).orElseGet(TaskSchedule::new);
        if (schedule.getId() == null) {
            schedule.setUserId(userId);
        }
        schedule.setTask(task);
        schedule.setScheduledDate(slot.scheduledDate());
        schedule.setStartTime(slot.startTime());
        schedule.setDurationMinutes(slot.durationMinutes());
        schedule.setPriorityLevel(SchedulePriority.MEDIUM);
        taskScheduleRepository.save(schedule);
    }

    private void persistHabitSlot(Habit habit, SuggestedSlot slot) {
        Long userId = currentUserService.requireUserId();
        HabitSchedule schedule = habitScheduleRepository.findByUserIdAndHabitId(userId, habit.getId()).orElseGet(HabitSchedule::new);
        if (schedule.getId() == null) {
            schedule.setUserId(userId);
        }
        schedule.setHabit(habit);
        schedule.setScheduledDate(slot.scheduledDate());
        schedule.setStartTime(slot.startTime());
        schedule.setDurationMinutes(slot.durationMinutes());
        schedule.setPriorityLevel(SchedulePriority.MEDIUM);
        habitScheduleRepository.save(schedule);
    }

    private void addPlacement(Map<LocalDate, List<int[]>> placedThisRun, SuggestedSlot slot) {
        int start = minutesOf(slot.startTime());
        placedThisRun.computeIfAbsent(slot.scheduledDate(), ignored -> new ArrayList<>())
                .add(new int[]{start, start + slot.durationMinutes()});
    }

    private Optional<SuggestedSlot> findSlot(Area area, int durationMinutes, LocalDate earliestDate, LocalDate latestDateInclusive,
                                              Map<LocalDate, List<int[]>> extraBusyByDate) {
        Map<DayOfWeek, TimeWindow> workingHours = settingsService.getWorkingHours();
        Map<DayOfWeek, TimeWindow> sleepHours = settingsService.getSleepHours();
        WorkingCalendarService.CalendarSettings calendarSettings = workingCalendarService.getCalendarSettings();
        boolean isWorkArea = Area.WORK_AREAS.contains(area);

        for (LocalDate date = earliestDate; !date.isAfter(latestDateInclusive); date = date.plusDays(1)) {
            List<int[]> windows = isWorkArea
                    ? workingSegments(date, workingHours, calendarSettings)
                    : wakingSegments(date, sleepHours);
            if (windows.isEmpty()) {
                continue;
            }
            List<int[]> busy = new ArrayList<>(busyIntervalsForDate(date));
            busy.addAll(extraBusyByDate.getOrDefault(date, List.of()));
            for (int[] window : windows) {
                Integer gapStart = firstGapStart(window, busy, durationMinutes);
                if (gapStart != null) {
                    return Optional.of(new SuggestedSlot(date, minutesToTime(gapStart), durationMinutes));
                }
            }
        }
        return Optional.empty();
    }

    private List<int[]> busyIntervalsForDate(LocalDate date) {
        Long userId = currentUserService.requireUserId();
        List<int[]> busy = new ArrayList<>();
        for (TaskSchedule schedule : taskScheduleRepository.findByUserIdAndScheduledDate(userId, date)) {
            int start = minutesOf(schedule.getStartTime());
            busy.add(new int[]{start, start + schedule.getDurationMinutes()});
        }
        for (HabitSchedule schedule : habitScheduleRepository.findByUserIdAndScheduledDate(userId, date)) {
            int start = minutesOf(schedule.getStartTime());
            busy.add(new int[]{start, start + schedule.getDurationMinutes()});
        }
        return busy;
    }

    private List<int[]> workingSegments(LocalDate date, Map<DayOfWeek, TimeWindow> workingHours, WorkingCalendarService.CalendarSettings calendarSettings) {
        if (!workingCalendarService.isWorkingDay(date, calendarSettings)) {
            return List.of();
        }
        TimeWindow window = workingHours.get(date.getDayOfWeek());
        if (window == null) {
            return List.of();
        }
        int start = minutesOf(window.start());
        int end = minutesOf(window.end());
        if (window.crossesMidnight()) {
            List<int[]> segments = new ArrayList<>();
            segments.add(new int[]{start, MINUTES_PER_DAY});
            segments.add(new int[]{0, end});
            return segments;
        }
        return start < end ? List.of(new int[]{start, end}) : List.of();
    }

    private List<int[]> wakingSegments(LocalDate date, Map<DayOfWeek, TimeWindow> sleepHours) {
        TimeWindow sleep = sleepHours.get(date.getDayOfWeek());
        if (sleep == null) {
            return List.of(new int[]{0, MINUTES_PER_DAY});
        }
        int start = minutesOf(sleep.start());
        int end = minutesOf(sleep.end());
        if (start == end) {
            return List.of();
        }
        if (sleep.crossesMidnight()) {
            return end < start ? List.of(new int[]{end, start}) : List.of();
        }
        List<int[]> segments = new ArrayList<>();
        if (start > 0) segments.add(new int[]{0, start});
        if (end < MINUTES_PER_DAY) segments.add(new int[]{end, MINUTES_PER_DAY});
        return segments;
    }

    private Integer firstGapStart(int[] window, List<int[]> busy, int durationMinutes) {
        List<int[]> relevantBusy = busy.stream()
                .filter(interval -> interval[1] > window[0] && interval[0] < window[1])
                .sorted(Comparator.comparingInt(interval -> interval[0]))
                .toList();
        int cursor = window[0];
        for (int[] interval : relevantBusy) {
            if (interval[0] - cursor >= durationMinutes) {
                return cursor;
            }
            cursor = Math.max(cursor, interval[1]);
        }
        if (window[1] - cursor >= durationMinutes) {
            return cursor;
        }
        return null;
    }

    private int minutesOf(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private LocalTime minutesToTime(int minutes) {
        int normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        return LocalTime.of(normalized / 60, normalized % 60);
    }
}
