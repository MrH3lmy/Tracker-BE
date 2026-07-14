package com.taskpriority.scheduler;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.SchedulePriority;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskSchedule;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TaskScheduleRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SchedulerService {
    private static final int DEFAULT_DURATION_MINUTES = 30;

    private final TaskRepository taskRepository;
    private final TaskScheduleRepository taskScheduleRepository;
    private final TaskService taskService;
    private final TaskApiMapper mapper;

    public SchedulerService(TaskRepository taskRepository, TaskScheduleRepository taskScheduleRepository, TaskService taskService, TaskApiMapper mapper) {
        this.taskRepository = taskRepository;
        this.taskScheduleRepository = taskScheduleRepository;
        this.taskService = taskService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public DayScheduleResponse getDaySchedule(LocalDate date) {
        List<TaskSchedule> schedulesForDay = taskScheduleRepository.findByScheduledDate(date);
        List<ScheduledTaskResponse> scheduled = schedulesForDay.stream()
                .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                .map(schedule -> toResponse(schedule, schedulesForDay))
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

        return new DayScheduleResponse(date, scheduled, unscheduledTasks.stream().map(mapper::toResponse).toList());
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

        List<TaskSchedule> schedulesForDay = taskScheduleRepository.findByScheduledDate(saved.getScheduledDate());
        return toResponse(saved, schedulesForDay);
    }

    @Transactional
    public void unschedule(Long taskId) {
        taskScheduleRepository.deleteByTaskId(taskId);
    }

    private ScheduledTaskResponse toResponse(TaskSchedule schedule, List<TaskSchedule> schedulesForDay) {
        Task task = schedule.getTask();
        taskService.computeDerivedFields(task);
        LocalTime endTime = schedule.getStartTime().plusMinutes(schedule.getDurationMinutes());
        List<Long> overlaps = schedulesForDay.stream()
                .filter(other -> !other.getTask().getId().equals(task.getId()))
                .filter(other -> overlaps(schedule, other))
                .map(other -> other.getTask().getId())
                .toList();
        return new ScheduledTaskResponse(task.getId(), mapper.toResponse(task), schedule.getScheduledDate(),
                schedule.getStartTime(), endTime, schedule.getDurationMinutes(), schedule.getPriorityLevel(), overlaps);
    }

    private boolean overlaps(TaskSchedule a, TaskSchedule b) {
        LocalTime aEnd = a.getStartTime().plusMinutes(a.getDurationMinutes());
        LocalTime bEnd = b.getStartTime().plusMinutes(b.getDurationMinutes());
        return a.getStartTime().isBefore(bEnd) && b.getStartTime().isBefore(aEnd);
    }
}
