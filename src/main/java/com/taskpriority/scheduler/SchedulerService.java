package com.taskpriority.scheduler;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.habit.HabitApiMapper;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitSchedule;
import com.taskpriority.model.SchedulePriority;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskSchedule;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.HabitScheduleRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TaskScheduleRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SchedulerService {
    static final int DEFAULT_DURATION_MINUTES = 30;

    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final TaskScheduleRepository taskScheduleRepository;
    private final HabitScheduleRepository habitScheduleRepository;
    private final TaskService taskService;
    private final HabitService habitService;
    private final TaskApiMapper taskMapper;
    private final HabitApiMapper habitMapper;

    public SchedulerService(TaskRepository taskRepository, HabitRepository habitRepository,
                             TaskScheduleRepository taskScheduleRepository, HabitScheduleRepository habitScheduleRepository,
                             TaskService taskService, HabitService habitService,
                             TaskApiMapper taskMapper, HabitApiMapper habitMapper) {
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.taskScheduleRepository = taskScheduleRepository;
        this.habitScheduleRepository = habitScheduleRepository;
        this.taskService = taskService;
        this.habitService = habitService;
        this.taskMapper = taskMapper;
        this.habitMapper = habitMapper;
    }

    @Transactional(readOnly = true)
    public DayScheduleResponse getDaySchedule(LocalDate date) {
        List<Booking> bookings = bookingsForDate(date);
        List<ScheduledEntryResponse> scheduled = bookings.stream()
                .sorted(Comparator.comparing(Booking::startTime))
                .map(booking -> toEntryResponse(booking, bookings))
                .toList();

        Set<Long> scheduledTaskIds = taskScheduleRepository.findAll().stream()
                .map(schedule -> schedule.getTask().getId())
                .collect(Collectors.toSet());
        List<Task> unscheduledTasks = taskRepository.findAll().stream()
                .filter(task -> !task.isDeleted())
                .filter(task -> task.getStatus() != Status.DONE && task.getStatus() != Status.CANCELLED)
                .filter(task -> !scheduledTaskIds.contains(task.getId()))
                .toList();
        taskService.computeDerivedFieldsBatch(unscheduledTasks);

        Set<Long> scheduledHabitIds = habitScheduleRepository.findAll().stream()
                .map(schedule -> schedule.getHabit().getId())
                .collect(Collectors.toSet());
        List<Habit> unscheduledHabits = habitRepository.findAll().stream()
                .filter(habit -> !habit.isDeleted())
                .filter(habit -> !scheduledHabitIds.contains(habit.getId()))
                .toList();
        habitService.applyTodayProgressBatch(unscheduledHabits);

        return new DayScheduleResponse(date, scheduled,
                unscheduledTasks.stream().map(taskMapper::toResponse).toList(),
                unscheduledHabits.stream().map(habitMapper::toResponse).toList());
    }

    @Transactional
    public ScheduledTaskResponse scheduleTask(Long taskId, ScheduleTaskRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + taskId + " not found"));

        TaskSchedule schedule = taskScheduleRepository.findByTaskId(taskId).orElseGet(TaskSchedule::new);
        schedule.setTask(task);
        schedule.setScheduledDate(request.scheduledDate());
        schedule.setStartTime(request.startTime());
        schedule.setDurationMinutes(request.durationMinutes() != null ? request.durationMinutes()
                : task.getEstimatedMinutes() != null ? task.getEstimatedMinutes() : DEFAULT_DURATION_MINUTES);
        schedule.setPriorityLevel(request.priorityLevel() != null ? request.priorityLevel() : SchedulePriority.MEDIUM);
        TaskSchedule saved = taskScheduleRepository.save(schedule);

        return toTaskResponse(saved, bookingsForDate(saved.getScheduledDate()));
    }

    @Transactional
    public void unschedule(Long taskId) {
        taskScheduleRepository.deleteByTaskId(taskId);
    }

    @Transactional
    public ScheduledHabitResponse scheduleHabit(Long habitId, ScheduleHabitRequest request) {
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit with id " + habitId + " not found"));

        HabitSchedule schedule = habitScheduleRepository.findByHabitId(habitId).orElseGet(HabitSchedule::new);
        schedule.setHabit(habit);
        schedule.setScheduledDate(request.scheduledDate());
        schedule.setStartTime(request.startTime());
        schedule.setDurationMinutes(request.durationMinutes() != null ? request.durationMinutes()
                : habit.getEstimatedMinutes() != null ? habit.getEstimatedMinutes() : DEFAULT_DURATION_MINUTES);
        schedule.setPriorityLevel(request.priorityLevel() != null ? request.priorityLevel() : SchedulePriority.MEDIUM);
        HabitSchedule saved = habitScheduleRepository.save(schedule);

        return toHabitResponse(saved, bookingsForDate(saved.getScheduledDate()));
    }

    @Transactional
    public void unscheduleHabit(Long habitId) {
        habitScheduleRepository.deleteByHabitId(habitId);
    }

    List<Booking> bookingsForDate(LocalDate date) {
        List<Booking> bookings = new ArrayList<>();
        for (TaskSchedule schedule : taskScheduleRepository.findByScheduledDate(date)) {
            bookings.add(Booking.ofTask(schedule));
        }
        for (HabitSchedule schedule : habitScheduleRepository.findByScheduledDate(date)) {
            bookings.add(Booking.ofHabit(schedule));
        }
        return bookings;
    }

    private ScheduledEntryResponse toEntryResponse(Booking booking, List<Booking> allBookings) {
        List<Long> overlaps = overlapIds(booking, allBookings);
        if (booking.isTask()) {
            Task task = booking.taskSchedule().getTask();
            taskService.computeDerivedFields(task);
            return new ScheduledEntryResponse("TASK", task.getId(), taskMapper.toResponse(task), null,
                    booking.taskSchedule().getScheduledDate(), booking.startTime(), booking.endTime(),
                    booking.durationMinutes(), booking.taskSchedule().getPriorityLevel(), overlaps);
        }
        Habit habit = booking.habitSchedule().getHabit();
        habitService.applyTodayProgress(habit);
        return new ScheduledEntryResponse("HABIT", habit.getId(), null, habitMapper.toResponse(habit),
                booking.habitSchedule().getScheduledDate(), booking.startTime(), booking.endTime(),
                booking.durationMinutes(), booking.habitSchedule().getPriorityLevel(), overlaps);
    }

    private ScheduledTaskResponse toTaskResponse(TaskSchedule schedule, List<Booking> bookings) {
        Task task = schedule.getTask();
        taskService.computeDerivedFields(task);
        LocalTime endTime = schedule.getStartTime().plusMinutes(schedule.getDurationMinutes());
        Booking self = Booking.ofTask(schedule);
        List<Long> overlaps = overlapIds(self, bookings);
        return new ScheduledTaskResponse(task.getId(), taskMapper.toResponse(task), schedule.getScheduledDate(),
                schedule.getStartTime(), endTime, schedule.getDurationMinutes(), schedule.getPriorityLevel(), overlaps);
    }

    private ScheduledHabitResponse toHabitResponse(HabitSchedule schedule, List<Booking> bookings) {
        Habit habit = schedule.getHabit();
        habitService.applyTodayProgress(habit);
        LocalTime endTime = schedule.getStartTime().plusMinutes(schedule.getDurationMinutes());
        Booking self = Booking.ofHabit(schedule);
        List<Long> overlaps = overlapIds(self, bookings);
        return new ScheduledHabitResponse(habit.getId(), habitMapper.toResponse(habit), schedule.getScheduledDate(),
                schedule.getStartTime(), endTime, schedule.getDurationMinutes(), schedule.getPriorityLevel(), overlaps);
    }

    private List<Long> overlapIds(Booking booking, List<Booking> allBookings) {
        return allBookings.stream()
                .filter(other -> !(other.isTask() == booking.isTask() && other.id().equals(booking.id())))
                .filter(other -> overlaps(booking, other))
                .map(Booking::id)
                .toList();
    }

    private boolean overlaps(Booking a, Booking b) {
        return a.startTime().isBefore(b.endTime()) && b.startTime().isBefore(a.endTime());
    }

    record Booking(boolean isTask, Long id, LocalTime startTime, int durationMinutes,
                    TaskSchedule taskSchedule, HabitSchedule habitSchedule) {
        static Booking ofTask(TaskSchedule schedule) {
            return new Booking(true, schedule.getTask().getId(), schedule.getStartTime(), schedule.getDurationMinutes(), schedule, null);
        }

        static Booking ofHabit(HabitSchedule schedule) {
            return new Booking(false, schedule.getHabit().getId(), schedule.getStartTime(), schedule.getDurationMinutes(), null, schedule);
        }

        LocalTime endTime() {
            return startTime.plusMinutes(durationMinutes);
        }
    }
}
