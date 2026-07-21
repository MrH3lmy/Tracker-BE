package com.taskpriority.home;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.dashboard.DashboardService;
import com.taskpriority.habit.HabitApiMapper;
import com.taskpriority.habit.HabitResponse;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.Habit;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.planning.PlanningService;
import com.taskpriority.planning.TaskRecommendationResponse;
import com.taskpriority.planning.TaskRecommendationService;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.scheduler.DayScheduleResponse;
import com.taskpriority.scheduler.SchedulerService;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Composes the "Today" command-center view purely from existing, already-tested
 * services/repositories -- no duplicated scoring or planning logic lives here.
 */
@Service
public class HomeService {
    private static final int TOP_RECOMMENDATIONS = 3;
    private static final int UPCOMING_DAYS_AHEAD = 6;
    private static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);

    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final DashboardService dashboardService;
    private final PlanningService planningService;
    private final TaskRecommendationService taskRecommendationService;
    private final SchedulerService schedulerService;
    private final HabitService habitService;
    private final HabitApiMapper habitApiMapper;
    private final CurrentUserService currentUserService;

    public HomeService(
            TaskRepository taskRepository,
            TaskService taskService,
            TaskApiMapper taskApiMapper,
            DashboardService dashboardService,
            PlanningService planningService,
            TaskRecommendationService taskRecommendationService,
            SchedulerService schedulerService,
            HabitService habitService,
            HabitApiMapper habitApiMapper,
            CurrentUserService currentUserService
    ) {
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.dashboardService = dashboardService;
        this.planningService = planningService;
        this.taskRecommendationService = taskRecommendationService;
        this.schedulerService = schedulerService;
        this.habitService = habitService;
        this.habitApiMapper = habitApiMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public HomeTodayResponse getToday() {
        Long userId = currentUserService.requireUserId();
        LocalDate today = LocalDate.now();

        TaskService.DashboardSummary summary = dashboardService.getDashboardSummary();

        TaskService.TodayView todayView = planningService.getTodayView();
        taskService.computeDerivedFieldsBatch(todayView.overdue());
        taskService.computeDerivedFieldsBatch(todayView.dueToday());

        List<TaskRecommendationResponse> topRecommendations = taskRecommendationService.getRecommendations().stream()
                .limit(TOP_RECOMMENDATIONS)
                .toList();

        DayScheduleResponse timeline = schedulerService.getDaySchedule(today);
        int scheduledFocusMinutes = timeline.scheduled().stream().mapToInt(entry -> entry.durationMinutes()).sum();

        List<Habit> habits = habitService.findAll();
        List<HabitResponse> habitsToday = habits.stream().map(habitApiMapper::toResponse).toList();
        int habitsTotalToday = habits.size();
        int habitsCompletedToday = (int) habits.stream().filter(Habit::isTodayTargetMet).count();

        List<Task> allTasks = taskRepository.findByUserId(userId);
        LocalDate upcomingEnd = today.plusDays(UPCOMING_DAYS_AHEAD);

        List<Task> upcoming = allTasks.stream()
                .filter(HomeService::isActive)
                .filter(task -> task.getDueDate() != null && task.getDueDate().isAfter(today) && !task.getDueDate().isAfter(upcomingEnd))
                .sorted(Comparator.comparing(Task::getDueDate))
                .toList();

        List<Task> waitingOrBlocked = allTasks.stream()
                .filter(task -> !task.isDeleted() && (task.getStatus() == Status.WAITING || task.getStatus() == Status.BLOCKED))
                .toList();

        List<Task> followUpsDue = allTasks.stream()
                .filter(HomeService::isActive)
                .filter(task -> task.getFollowUpDate() != null && !task.getFollowUpDate().isAfter(today))
                .sorted(Comparator.comparing(Task::getFollowUpDate))
                .toList();

        taskService.computeDerivedFieldsBatch(upcoming);
        taskService.computeDerivedFieldsBatch(waitingOrBlocked);
        taskService.computeDerivedFieldsBatch(followUpsDue);

        return new HomeTodayResponse(
                today,
                summary,
                todayView.dueToday().stream().map(taskApiMapper::toResponse).toList(),
                todayView.overdue().stream().map(taskApiMapper::toResponse).toList(),
                topRecommendations,
                timeline.scheduled(),
                scheduledFocusMinutes,
                habitsToday,
                habitsCompletedToday,
                habitsTotalToday,
                upcoming.stream().map(taskApiMapper::toResponse).toList(),
                waitingOrBlocked.stream().map(taskApiMapper::toResponse).toList(),
                followUpsDue.stream().map(taskApiMapper::toResponse).toList()
        );
    }

    private static boolean isActive(Task task) {
        return !task.isDeleted() && !CLOSED_STATUSES.contains(task.getStatus());
    }
}
