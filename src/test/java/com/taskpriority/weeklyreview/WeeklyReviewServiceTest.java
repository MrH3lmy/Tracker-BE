package com.taskpriority.weeklyreview;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.habit.HabitService;
import com.taskpriority.model.Habit;
import com.taskpriority.model.Project;
import com.taskpriority.model.ProjectStatus;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.WeeklyReview;
import com.taskpriority.project.ProjectOverviewResponse;
import com.taskpriority.project.ProjectResponse;
import com.taskpriority.project.ProjectService;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.WeeklyReviewRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WeeklyReviewServiceTest {
    private static final Long USER_ID = 1L;

    private WeeklyReviewRepository weeklyReviewRepository;
    private TaskRepository taskRepository;
    private TaskService taskService;
    private HabitService habitService;
    private HabitCheckInRepository habitCheckInRepository;
    private ProjectRepository projectRepository;
    private ProjectService projectService;
    private WeeklyReviewService weeklyReviewService;

    private Task task(Long id, Status status, LocalDate dueDate, LocalDateTime completedDate, LocalDateTime updatedDate) {
        Task task = new Task("Task " + id);
        task.setId(id);
        task.setStatus(status);
        task.setDueDate(dueDate);
        task.setCompletedDate(completedDate);
        task.setUpdatedDate(updatedDate);
        return task;
    }

    @BeforeEach
    void setUp() {
        weeklyReviewRepository = mock(WeeklyReviewRepository.class);
        taskRepository = mock(TaskRepository.class);
        taskService = mock(TaskService.class);
        habitService = mock(HabitService.class);
        habitCheckInRepository = mock(HabitCheckInRepository.class);
        projectRepository = mock(ProjectRepository.class);
        projectService = mock(ProjectService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(habitService.findAll()).thenReturn(List.of());
        when(projectRepository.findByUserId(USER_ID)).thenReturn(List.of());
        when(weeklyReviewRepository.save(any(WeeklyReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        weeklyReviewService = new WeeklyReviewService(
                weeklyReviewRepository, taskRepository, taskService, new TaskApiMapper(),
                habitService, habitCheckInRepository, projectRepository, projectService, currentUserService);
    }

    @Test
    void findByIdThrowsWhenReviewDoesNotBelongToTheCurrentUser() {
        when(weeklyReviewRepository.findByUserIdAndId(USER_ID, 99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> weeklyReviewService.findById(99L));
    }

    @Test
    void findAllDelegatesToTheRepositoryForTheCurrentUser() {
        when(weeklyReviewRepository.findByUserIdOrderByWeekStartDateDesc(eq(USER_ID), any(Pageable.class))).thenReturn(List.of(new WeeklyReview()));

        List<WeeklyReview> reviews = weeklyReviewService.findAll(10);

        assertEquals(1, reviews.size());
    }

    @Test
    void currentDraftWeekStartIsAMonday() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(java.time.DayOfWeek.MONDAY, draft.weekStartDate().getDayOfWeek());
        assertEquals(draft.weekStartDate().plusDays(6), draft.weekEndDate());
    }

    @Test
    void draftIncludesOnlyTasksCompletedWithinTheWeek() {
        LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1L);
        Task completedThisWeek = task(1L, Status.DONE, null, weekStart.atTime(10, 0), null);
        Task completedLastWeek = task(2L, Status.DONE, null, weekStart.minusDays(3).atTime(10, 0), null);
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(completedThisWeek, completedLastWeek));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(1, draft.completedTasks().size());
        assertEquals(1L, draft.completedTasks().get(0).id());
    }

    @Test
    void draftIncludesActiveOverdueTasksButNotClosedOnes() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        Task overdueActive = task(1L, Status.NOT_STARTED, yesterday, null, null);
        Task overdueButDone = task(2L, Status.DONE, yesterday, LocalDateTime.now(), null);
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(overdueActive, overdueButDone));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(1, draft.overdueTasks().size());
        assertEquals(1L, draft.overdueTasks().get(0).id());
    }

    @Test
    void draftIncludesBlockedAndWaitingTasks() {
        Task blocked = task(1L, Status.BLOCKED, null, null, null);
        Task waiting = task(2L, Status.WAITING, null, null, null);
        Task active = task(3L, Status.NOT_STARTED, null, null, null);
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(blocked, waiting, active));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(2, draft.blockedOrWaitingTasks().size());
    }

    @Test
    void draftFlagsStaleActiveTasksNotTouchedInFourteenDays() {
        Task stale = task(1L, Status.NOT_STARTED, null, null, LocalDateTime.now().minusDays(20));
        Task fresh = task(2L, Status.NOT_STARTED, null, null, LocalDateTime.now().minusDays(2));
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(stale, fresh));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(1, draft.staleTasks().size());
        assertEquals(1L, draft.staleTasks().get(0).id());
    }

    @Test
    void draftComputesHabitPerformanceFromCheckInCounts() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());
        Habit habit = new Habit("Meditate");
        habit.setId(5L);
        habit.setDailyTargetCount(1);
        when(habitService.findAll()).thenReturn(List.of(habit));
        HabitCheckInRepository.HabitCheckInDailyCount count = mock(HabitCheckInRepository.HabitCheckInDailyCount.class);
        when(count.getHabitId()).thenReturn(5L);
        when(count.getCheckInCount()).thenReturn(3L);
        when(habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(eq(USER_ID), any(), any(), any())).thenReturn(List.of(count));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(1, draft.habitPerformance().size());
        HabitPerformanceResponse performance = draft.habitPerformance().get(0);
        assertEquals(3, performance.checkIns());
        assertEquals(7, performance.target());
        assertEquals(43, performance.percent());
    }

    @Test
    void draftOmitsLowRiskProjectsButIncludesAtRiskOnes() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());
        Project lowRiskProject = new Project("On track");
        lowRiskProject.setId(1L);
        Project atRiskProject = new Project("Behind schedule");
        atRiskProject.setId(2L);
        when(projectRepository.findByUserId(USER_ID)).thenReturn(List.of(lowRiskProject, atRiskProject));
        when(projectService.getOverview(1L)).thenReturn(overviewWithRisk(1L, "On track", "LOW"));
        when(projectService.getOverview(2L)).thenReturn(overviewWithRisk(2L, "Behind schedule", "HIGH"));

        WeeklyReviewDraftResponse draft = weeklyReviewService.getCurrentDraft();

        assertEquals(1, draft.projectsAtRisk().size());
        assertEquals(2L, draft.projectsAtRisk().get(0).projectId());
        assertEquals("HIGH", draft.projectsAtRisk().get(0).riskLevel());
    }

    private ProjectOverviewResponse overviewWithRisk(Long id, String name, String riskLevel) {
        ProjectResponse project = new ProjectResponse(id, name, null, ProjectStatus.ACTIVE, null, null, null, null, USER_ID, LocalDateTime.now());
        return new ProjectOverviewResponse(project, 0, 0, 0, 0, 0, 0.0, 0.0, List.of(), 0, riskLevel, "reason");
    }

    @Test
    void completeReviewAppliesRescheduleDecision() {
        weeklyReviewService.completeReview(new CompleteWeeklyReviewRequest(LocalDate.now(), "summary", null,
                List.of(new TaskDecisionRequest(1L, DecisionAction.RESCHEDULE, LocalDate.now().plusDays(3)))));

        verify(taskService).updateDueDate(1L, LocalDate.now().plusDays(3));
    }

    @Test
    void completeReviewRescheduleWithoutDueDateThrows() {
        CompleteWeeklyReviewRequest request = new CompleteWeeklyReviewRequest(LocalDate.now(), null, null,
                List.of(new TaskDecisionRequest(1L, DecisionAction.RESCHEDULE, null)));

        assertThrows(IllegalArgumentException.class, () -> weeklyReviewService.completeReview(request));
    }

    @Test
    void completeReviewAppliesArchiveDecisionAsCancelledStatus() {
        weeklyReviewService.completeReview(new CompleteWeeklyReviewRequest(LocalDate.now(), null, null,
                List.of(new TaskDecisionRequest(1L, DecisionAction.ARCHIVE, null))));

        verify(taskService).updateStatus(1L, Status.CANCELLED);
    }

    @Test
    void completeReviewAppliesDeleteAndCompleteDecisions() {
        weeklyReviewService.completeReview(new CompleteWeeklyReviewRequest(LocalDate.now(), null, null,
                List.of(new TaskDecisionRequest(1L, DecisionAction.DELETE, null), new TaskDecisionRequest(2L, DecisionAction.COMPLETE, null))));

        verify(taskService).delete(1L);
        verify(taskService).markComplete(2L);
    }

    @Test
    void completeReviewPersistsSummaryAndLinkedNote() {
        WeeklyReview saved = weeklyReviewService.completeReview(new CompleteWeeklyReviewRequest(LocalDate.of(2026, 1, 5), "Great week", 42L, null));

        assertEquals(USER_ID, saved.getUserId());
        assertEquals(LocalDate.of(2026, 1, 5), saved.getWeekStartDate());
        assertEquals("Great week", saved.getSummary());
        assertEquals(42L, saved.getLinkedNoteId());
        assertNotNull(saved.getCompletedAt());
    }
}
