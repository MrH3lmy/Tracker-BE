package com.taskpriority.weeklyreview;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.Habit;
import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.WeeklyReview;
import com.taskpriority.project.ProjectService;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.WeeklyReviewRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class WeeklyReviewService {
    private static final int STALE_DAYS = 14;
    private static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);

    private final WeeklyReviewRepository weeklyReviewRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final HabitService habitService;
    private final HabitCheckInRepository habitCheckInRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final CurrentUserService currentUserService;

    public WeeklyReviewService(WeeklyReviewRepository weeklyReviewRepository, TaskRepository taskRepository,
                                TaskService taskService, TaskApiMapper taskApiMapper, HabitService habitService,
                                HabitCheckInRepository habitCheckInRepository, ProjectRepository projectRepository,
                                ProjectService projectService, CurrentUserService currentUserService) {
        this.weeklyReviewRepository = weeklyReviewRepository;
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.habitService = habitService;
        this.habitCheckInRepository = habitCheckInRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<WeeklyReview> findAll(int limit) {
        Long userId = currentUserService.requireUserId();
        return weeklyReviewRepository.findByUserIdOrderByWeekStartDateDesc(userId, PageRequest.of(0, Math.max(1, limit)));
    }

    @Transactional(readOnly = true)
    public WeeklyReview findById(Long id) {
        Long userId = currentUserService.requireUserId();
        return weeklyReviewRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Weekly review with id " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public WeeklyReviewDraftResponse getCurrentDraft() {
        Long userId = currentUserService.requireUserId();
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1L);
        LocalDate weekEnd = weekStart.plusDays(6);
        return buildDraft(userId, weekStart, weekEnd);
    }

    @Transactional
    public WeeklyReview completeReview(CompleteWeeklyReviewRequest request) {
        Long userId = currentUserService.requireUserId();
        if (request.decisions() != null) {
            request.decisions().forEach(this::applyDecision);
        }
        WeeklyReview review = new WeeklyReview();
        review.setUserId(userId);
        review.setWeekStartDate(request.weekStartDate());
        review.setCompletedAt(LocalDateTime.now());
        review.setSummary(request.summary());
        review.setLinkedNoteId(request.linkedNoteId());
        return weeklyReviewRepository.save(review);
    }

    private void applyDecision(TaskDecisionRequest decision) {
        switch (decision.action()) {
            case RESCHEDULE -> {
                if (decision.newDueDate() == null) {
                    throw new IllegalArgumentException("newDueDate is required for a RESCHEDULE decision");
                }
                taskService.updateDueDate(decision.taskId(), decision.newDueDate());
            }
            case ARCHIVE -> taskService.updateStatus(decision.taskId(), Status.CANCELLED);
            case DELETE -> taskService.delete(decision.taskId());
            case COMPLETE -> taskService.markComplete(decision.taskId());
        }
    }

    private WeeklyReviewDraftResponse buildDraft(Long userId, LocalDate weekStart, LocalDate weekEnd) {
        List<Task> allTasks = taskRepository.findByUserId(userId);
        LocalDateTime weekStartDateTime = weekStart.atStartOfDay();
        LocalDateTime weekEndDateTime = weekEnd.plusDays(1).atStartOfDay();
        LocalDate today = LocalDate.now();
        LocalDateTime staleCutoff = LocalDateTime.now().minusDays(STALE_DAYS);

        List<Task> completedTasks = allTasks.stream()
                .filter(task -> task.getCompletedDate() != null)
                .filter(task -> !task.getCompletedDate().isBefore(weekStartDateTime) && task.getCompletedDate().isBefore(weekEndDateTime))
                .sorted(Comparator.comparing(Task::getCompletedDate).reversed())
                .toList();

        List<Task> overdueTasks = allTasks.stream()
                .filter(WeeklyReviewService::isActive)
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(today))
                .sorted(Comparator.comparing(Task::getDueDate))
                .toList();

        List<Task> blockedOrWaiting = allTasks.stream()
                .filter(task -> !task.isDeleted() && (task.getStatus() == Status.WAITING || task.getStatus() == Status.BLOCKED))
                .toList();

        List<Task> staleTasks = allTasks.stream()
                .filter(WeeklyReviewService::isActive)
                .filter(task -> task.getUpdatedDate() == null || task.getUpdatedDate().isBefore(staleCutoff))
                .sorted(Comparator.comparing(Task::getUpdatedDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();

        taskService.computeDerivedFieldsBatch(completedTasks);
        taskService.computeDerivedFieldsBatch(overdueTasks);
        taskService.computeDerivedFieldsBatch(blockedOrWaiting);
        taskService.computeDerivedFieldsBatch(staleTasks);

        return new WeeklyReviewDraftResponse(
                weekStart, weekEnd,
                completedTasks.stream().map(taskApiMapper::toResponse).toList(),
                overdueTasks.stream().map(taskApiMapper::toResponse).toList(),
                blockedOrWaiting.stream().map(taskApiMapper::toResponse).toList(),
                computeHabitPerformance(userId, weekStart, weekEnd),
                computeProjectsAtRisk(),
                staleTasks.stream().map(taskApiMapper::toResponse).toList()
        );
    }

    private List<HabitPerformanceResponse> computeHabitPerformance(Long userId, LocalDate weekStart, LocalDate weekEnd) {
        List<Habit> habits = habitService.findAll();
        if (habits.isEmpty()) return List.of();

        List<Long> habitIds = habits.stream().map(Habit::getId).toList();
        Map<Long, Integer> checkInsByHabit = new HashMap<>();
        habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(userId, habitIds, weekStart, weekEnd)
                .forEach(count -> checkInsByHabit.merge(count.getHabitId(), count.getCheckInCount().intValue(), Integer::sum));

        return habits.stream()
                .map(habit -> {
                    int checkIns = checkInsByHabit.getOrDefault(habit.getId(), 0);
                    int target = habit.getDailyTargetCount() * 7;
                    int percent = target == 0 ? 0 : (int) Math.round(Math.min(checkIns, target) * 100.0 / target);
                    return new HabitPerformanceResponse(habit.getId(), habit.getTitle(), checkIns, target, percent);
                })
                .toList();
    }

    private List<ProjectAtRiskResponse> computeProjectsAtRisk() {
        List<Project> projects = projectRepository.findByUserId(currentUserService.requireUserId());
        return projects.stream()
                .map(project -> projectService.getOverview(project.getId()))
                .filter(overview -> !"LOW".equals(overview.riskLevel()))
                .map(overview -> new ProjectAtRiskResponse(
                        overview.project().id(), overview.project().name(), overview.riskLevel(), overview.riskReason(), overview.progressPercent()))
                .toList();
    }

    private static boolean isActive(Task task) {
        return !task.isDeleted() && !CLOSED_STATUSES.contains(task.getStatus());
    }
}
