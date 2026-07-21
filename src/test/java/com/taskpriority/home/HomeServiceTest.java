package com.taskpriority.home;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.dashboard.DashboardService;
import com.taskpriority.habit.HabitApiMapper;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.Habit;
import com.taskpriority.model.PriorityCategory;
import com.taskpriority.model.SchedulePriority;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.planning.PlanningService;
import com.taskpriority.planning.TaskRecommendationResponse;
import com.taskpriority.planning.TaskRecommendationService;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.scheduler.DayScheduleResponse;
import com.taskpriority.scheduler.ScheduledEntryResponse;
import com.taskpriority.scheduler.SchedulerService;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HomeServiceTest {
    private static final Long USER_ID = 1L;
    private static final LocalDate TODAY = LocalDate.now();

    private TaskRepository taskRepository;
    private TaskService taskService;
    private DashboardService dashboardService;
    private PlanningService planningService;
    private TaskRecommendationService taskRecommendationService;
    private SchedulerService schedulerService;
    private HabitService habitService;
    private CurrentUserService currentUserService;
    private HomeService homeService;

    private Task task(Long id, String title, Status status) {
        Task task = new Task();
        task.setId(id);
        task.setTitle(title);
        task.setStatus(status);
        task.setCreatedDate(LocalDateTime.now());
        return task;
    }

    private Habit habit(Long id, String title, boolean targetMet) {
        Habit habit = new Habit();
        habit.setId(id);
        habit.setTitle(title);
        habit.setDailyTargetCount(1);
        habit.setTodayTargetMet(targetMet);
        habit.setTodayCheckInCount(targetMet ? 1 : 0);
        return habit;
    }

    @BeforeEach
    void setUp() {
        taskRepository = mock(TaskRepository.class);
        taskService = mock(TaskService.class);
        dashboardService = mock(DashboardService.class);
        planningService = mock(PlanningService.class);
        taskRecommendationService = mock(TaskRecommendationService.class);
        schedulerService = mock(SchedulerService.class);
        habitService = mock(HabitService.class);
        currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        doNothing().when(taskService).computeDerivedFieldsBatch(any());

        homeService = new HomeService(
                taskRepository, taskService, new TaskApiMapper(), dashboardService, planningService,
                taskRecommendationService, schedulerService, habitService, new HabitApiMapper(), currentUserService
        );
    }

    @Test
    void combinesCountsFromEachSourceService() {
        TaskService.DashboardSummary summary = new TaskService.DashboardSummary(
                10, 6, 4, 1, 2, 3, 2, 0, 1, 1, 40.0, Map.of(), Map.of(PriorityCategory.DO_NOW, 1L)
        );
        when(dashboardService.getDashboardSummary()).thenReturn(summary);
        when(planningService.getTodayView()).thenReturn(new TaskService.TodayView(List.of(), List.of(), List.of()));
        when(taskRecommendationService.getRecommendations()).thenReturn(List.of());
        when(schedulerService.getDaySchedule(TODAY)).thenReturn(new DayScheduleResponse(TODAY, List.of(
                new ScheduledEntryResponse("TASK", 1L, null, null, TODAY, LocalTime.of(9, 0), LocalTime.of(10, 0), 60, SchedulePriority.HIGH, List.of()),
                new ScheduledEntryResponse("HABIT", 2L, null, null, TODAY, LocalTime.of(11, 0), LocalTime.of(11, 30), 30, SchedulePriority.MEDIUM, List.of())
        ), List.of(), List.of()));
        when(habitService.findAll()).thenReturn(List.of(habit(1L, "Read", true), habit(2L, "Run", false)));
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());

        HomeTodayResponse response = homeService.getToday();

        assertEquals(summary, response.summary());
        assertEquals(90, response.scheduledFocusMinutes());
        assertEquals(2, response.habitsTotalToday());
        assertEquals(1, response.habitsCompletedToday());
        assertEquals(TODAY, response.date());
    }

    @Test
    void capsTopRecommendationsAtThree() {
        when(dashboardService.getDashboardSummary()).thenReturn(new TaskService.DashboardSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, Map.of(), Map.of()));
        when(planningService.getTodayView()).thenReturn(new TaskService.TodayView(List.of(), List.of(), List.of()));
        when(schedulerService.getDaySchedule(TODAY)).thenReturn(new DayScheduleResponse(TODAY, List.of(), List.of(), List.of()));
        when(habitService.findAll()).thenReturn(List.of());
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());

        List<TaskRecommendationResponse> fiveRecommendations = List.of(
                new TaskRecommendationResponse(null, "Do next", List.of(), "", 0.9, List.of(), 1),
                new TaskRecommendationResponse(null, "Do next", List.of(), "", 0.8, List.of(), 2),
                new TaskRecommendationResponse(null, "Do next", List.of(), "", 0.7, List.of(), 3),
                new TaskRecommendationResponse(null, "Do next", List.of(), "", 0.6, List.of(), 4),
                new TaskRecommendationResponse(null, "Do next", List.of(), "", 0.5, List.of(), 5)
        );
        when(taskRecommendationService.getRecommendations()).thenReturn(fiveRecommendations);

        HomeTodayResponse response = homeService.getToday();

        assertEquals(3, response.topRecommendations().size());
        assertEquals(1, response.topRecommendations().get(0).rank());
    }

    @Test
    void classifiesUpcomingWaitingAndFollowUpTasksFromTheFullTaskList() {
        when(dashboardService.getDashboardSummary()).thenReturn(new TaskService.DashboardSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, Map.of(), Map.of()));
        when(planningService.getTodayView()).thenReturn(new TaskService.TodayView(List.of(), List.of(), List.of()));
        when(taskRecommendationService.getRecommendations()).thenReturn(List.of());
        when(schedulerService.getDaySchedule(TODAY)).thenReturn(new DayScheduleResponse(TODAY, List.of(), List.of(), List.of()));
        when(habitService.findAll()).thenReturn(List.of());

        Task upcoming = task(1L, "Upcoming", Status.NOT_STARTED);
        upcoming.setDueDate(TODAY.plusDays(2));

        Task tooFarOut = task(2L, "Too far out", Status.NOT_STARTED);
        tooFarOut.setDueDate(TODAY.plusDays(30));

        Task waiting = task(3L, "Waiting on vendor", Status.WAITING);
        Task blocked = task(4L, "Blocked task", Status.BLOCKED);

        Task followUpDue = task(5L, "Check back", Status.IN_PROGRESS);
        followUpDue.setFollowUpDate(TODAY.minusDays(1));

        Task followUpFuture = task(6L, "Not yet", Status.IN_PROGRESS);
        followUpFuture.setFollowUpDate(TODAY.plusDays(5));

        Task doneTask = task(7L, "Already done", Status.DONE);
        doneTask.setFollowUpDate(TODAY.minusDays(1));

        Task deletedTask = task(8L, "Deleted", Status.WAITING);
        deletedTask.setDeleted(true);

        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(
                upcoming, tooFarOut, waiting, blocked, followUpDue, followUpFuture, doneTask, deletedTask
        ));

        HomeTodayResponse response = homeService.getToday();

        assertEquals(1, response.upcomingTasks().size());
        assertEquals("Upcoming", response.upcomingTasks().get(0).title());

        assertEquals(2, response.waitingOrBlocked().size());
        assertTrue(response.waitingOrBlocked().stream().anyMatch(t -> t.title().equals("Waiting on vendor")));
        assertTrue(response.waitingOrBlocked().stream().anyMatch(t -> t.title().equals("Blocked task")));

        assertEquals(1, response.followUpsDue().size());
        assertEquals("Check back", response.followUpsDue().get(0).title());
    }
}
