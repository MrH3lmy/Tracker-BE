package com.taskpriority.scheduler;

import com.taskpriority.habit.HabitApiMapper;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.SchedulePriority;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskSchedule;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.HabitScheduleRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TaskScheduleRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SchedulerServiceTest {

    private TaskRepository taskRepository;
    private HabitRepository habitRepository;
    private TaskScheduleRepository taskScheduleRepository;
    private HabitScheduleRepository habitScheduleRepository;
    private TaskService taskService;
    private HabitService habitService;
    private SchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        taskRepository = mock(TaskRepository.class);
        habitRepository = mock(HabitRepository.class);
        taskScheduleRepository = mock(TaskScheduleRepository.class);
        habitScheduleRepository = mock(HabitScheduleRepository.class);
        taskService = mock(TaskService.class);
        habitService = mock(HabitService.class);
        doNothing().when(taskService).computeDerivedFields(any(Task.class));
        schedulerService = new SchedulerService(taskRepository, habitRepository, taskScheduleRepository, habitScheduleRepository,
                taskService, habitService, new TaskApiMapper(), new HabitApiMapper());
    }

    private Task task(Long id, String title) {
        Task task = new Task(title);
        task.setId(id);
        return task;
    }

    private TaskSchedule schedule(Task task, LocalDate date, LocalTime start, int durationMinutes) {
        TaskSchedule schedule = new TaskSchedule();
        schedule.setTask(task);
        schedule.setScheduledDate(date);
        schedule.setStartTime(start);
        schedule.setDurationMinutes(durationMinutes);
        schedule.setPriorityLevel(SchedulePriority.MEDIUM);
        return schedule;
    }

    @Test
    void scheduleTaskCreatesANewScheduleWhenNoneExists() {
        Task task = task(1L, "Gym");
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskScheduleRepository.findByTaskId(1L)).thenReturn(Optional.empty());
        when(taskScheduleRepository.save(any(TaskSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskScheduleRepository.findByScheduledDate(LocalDate.of(2026, 7, 20))).thenReturn(List.of());

        ScheduleTaskRequest request = new ScheduleTaskRequest(LocalDate.of(2026, 7, 20), LocalTime.of(6, 0), 45, SchedulePriority.HIGH);
        ScheduledTaskResponse response = schedulerService.scheduleTask(1L, request);

        assertEquals(LocalTime.of(6, 0), response.startTime());
        assertEquals(LocalTime.of(6, 45), response.endTime());
        assertEquals(SchedulePriority.HIGH, response.priorityLevel());
        assertTrue(response.overlapsWithTaskIds().isEmpty());
    }

    @Test
    void scheduleTaskDefaultsDurationFromEstimatedMinutesWhenNotProvided() {
        Task task = task(2L, "Deep work block");
        task.setEstimatedMinutes(90);
        when(taskRepository.findById(2L)).thenReturn(Optional.of(task));
        when(taskScheduleRepository.findByTaskId(2L)).thenReturn(Optional.empty());
        when(taskScheduleRepository.save(any(TaskSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskScheduleRepository.findByScheduledDate(any())).thenReturn(List.of());

        ScheduleTaskRequest request = new ScheduleTaskRequest(LocalDate.of(2026, 7, 20), LocalTime.of(9, 0), null, null);
        ScheduledTaskResponse response = schedulerService.scheduleTask(2L, request);

        assertEquals(90, response.durationMinutes());
        assertEquals(SchedulePriority.MEDIUM, response.priorityLevel());
    }

    @Test
    void detectsOverlapBetweenTwoScheduledTasksOnTheSameDay() {
        LocalDate date = LocalDate.of(2026, 7, 20);
        Task existingTask = task(3L, "Standup");
        TaskSchedule existingSchedule = schedule(existingTask, date, LocalTime.of(9, 0), 30);

        Task newTask = task(4L, "Focus block");
        when(taskRepository.findById(4L)).thenReturn(Optional.of(newTask));
        when(taskScheduleRepository.findByTaskId(4L)).thenReturn(Optional.empty());
        when(taskScheduleRepository.save(any(TaskSchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskScheduleRepository.findByScheduledDate(date)).thenReturn(List.of(existingSchedule));

        ScheduleTaskRequest request = new ScheduleTaskRequest(date, LocalTime.of(9, 15), 30, null);
        ScheduledTaskResponse response = schedulerService.scheduleTask(4L, request);

        assertEquals(List.of(3L), response.overlapsWithTaskIds());
    }

    @Test
    void unscheduleDeletesTheScheduleForTheTask() {
        schedulerService.unschedule(9L);

        verify(taskScheduleRepository).deleteByTaskId(9L);
    }
}
