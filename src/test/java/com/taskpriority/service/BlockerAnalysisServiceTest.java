package com.taskpriority.service;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Role;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskDependency;
import com.taskpriority.model.Tier;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BlockerAnalysisServiceTest {
    private static final Long USER_ID = 1L;

    private TaskRepository taskRepository;
    private TaskDependencyRepository taskDependencyRepository;
    private TaskService taskService;
    private BlockerAnalysisService analysisService;

    @BeforeEach
    void setUp() {
        taskRepository = mock(TaskRepository.class);
        taskDependencyRepository = mock(TaskDependencyRepository.class);
        taskService = mock(TaskService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(USER_ID, "u@example.com", Tier.FREE, Role.USER));
        // computeDerivedFields normally mutates priorityScore/etc; tests set those fields directly on the fixtures.
        doNothing().when(taskService).computeDerivedFields(any(Task.class));
        analysisService = new BlockerAnalysisService(taskRepository, taskDependencyRepository, taskService, currentUserService);
    }

    private Task task(Long id, String title, Status status) {
        Task task = new Task();
        task.setId(id);
        task.setTitle(title);
        task.setStatus(status);
        task.setCreatedDate(LocalDateTime.now());
        return task;
    }

    private TaskDependency dependency(Task blockedTask, Task blockerTask) {
        TaskDependency dependency = new TaskDependency();
        dependency.setTask(blockedTask);
        dependency.setBlocksTask(blockerTask);
        return dependency;
    }

    @Test
    void returnsNoWarningsForCleanTasks() {
        Task task = task(1L, "Clean task", Status.NOT_STARTED);
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(task));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of());

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertTrue(analysis.warnings().isEmpty());
        assertEquals(0, analysis.dependencyCount());
    }

    @Test
    void flagsStaleWaitingTaskPastThreshold() {
        Task task = task(1L, "Waiting task", Status.WAITING);
        task.setCreatedDate(LocalDateTime.now().minusDays(10));
        task.setWaitingOn("vendor response");
        task.setFollowUpDate(LocalDate.now().plusDays(1));
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(task));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of());

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertEquals(1, analysis.warnings().size());
        assertEquals("STALE_WAITING", analysis.warnings().get(0).type());
    }

    @Test
    void flagsMissingWaitingOnAndMissingFollowUp() {
        Task task = task(1L, "Waiting task", Status.WAITING);
        task.setCreatedDate(LocalDateTime.now());
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(task));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of());

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        List<String> types = analysis.warnings().stream().map(BlockerAnalysisService.BlockerWarning::type).toList();
        assertTrue(types.contains("MISSING_WAITING_ON"));
        assertTrue(types.contains("MISSING_FOLLOW_UP"));
        assertFalse(types.contains("STALE_WAITING"));
    }

    @Test
    void flagsOverdueFollowUpForWaitingAndBlockedTasks() {
        Task waiting = task(1L, "Waiting", Status.WAITING);
        waiting.setWaitingOn("someone");
        waiting.setFollowUpDate(LocalDate.now().minusDays(2));
        Task blocked = task(2L, "Blocked", Status.BLOCKED);
        blocked.setFollowUpDate(LocalDate.now().minusDays(1));
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(waiting, blocked));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of());

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        long overdueCount = analysis.warnings().stream()
                .filter(w -> w.type().equals("OVERDUE_FOLLOW_UP"))
                .count();
        assertEquals(2, overdueCount);
    }

    @Test
    void doesNotFlagFutureFollowUpAsOverdue() {
        Task waiting = task(1L, "Waiting", Status.WAITING);
        waiting.setWaitingOn("someone");
        waiting.setFollowUpDate(LocalDate.now().plusDays(3));
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(waiting));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of());

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertTrue(analysis.warnings().stream().noneMatch(w -> w.type().equals("OVERDUE_FOLLOW_UP")));
    }

    @Test
    void flagsTaskThatBlocksHighPriorityWork() {
        Task blocker = task(1L, "Blocker", Status.NOT_STARTED);
        Task blockedHighPriority = task(2L, "Important blocked task", Status.NOT_STARTED);
        blockedHighPriority.setImportant(true);
        TaskDependency dependency = dependency(blockedHighPriority, blocker);

        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(blocker, blockedHighPriority));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of(dependency));

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertEquals(1, analysis.dependencyCount());
        List<BlockerAnalysisService.BlockerWarning> blocksWarnings = analysis.warnings().stream()
                .filter(w -> w.type().equals("BLOCKS_HIGH_PRIORITY")).toList();
        assertEquals(1, blocksWarnings.size());
        assertEquals(1L, blocksWarnings.get(0).taskId());
        assertEquals(List.of(2L), blocksWarnings.get(0).relatedTaskIds());
    }

    @Test
    void doesNotFlagBlockerOfLowPriorityWork() {
        Task blocker = task(1L, "Blocker", Status.NOT_STARTED);
        Task blockedLowPriority = task(2L, "Ordinary blocked task", Status.NOT_STARTED);
        TaskDependency dependency = dependency(blockedLowPriority, blocker);

        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(blocker, blockedLowPriority));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of(dependency));

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertTrue(analysis.warnings().stream().noneMatch(w -> w.type().equals("BLOCKS_HIGH_PRIORITY")));
    }

    @Test
    void detectsCircularDependency() {
        Task taskA = task(1L, "A", Status.NOT_STARTED);
        Task taskB = task(2L, "B", Status.NOT_STARTED);
        // A depends on B (B blocks A), and B depends on A (A blocks B) -> cycle.
        TaskDependency aBlockedByB = dependency(taskA, taskB);
        TaskDependency bBlockedByA = dependency(taskB, taskA);

        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(taskA, taskB));
        when(taskDependencyRepository.findByUserId(USER_ID)).thenReturn(List.of(aBlockedByB, bBlockedByA));

        BlockerAnalysisService.BlockerAnalysis analysis = analysisService.analyze();

        assertTrue(analysis.warnings().stream().anyMatch(w -> w.type().equals("CIRCULAR_DEPENDENCY")));
    }
}
