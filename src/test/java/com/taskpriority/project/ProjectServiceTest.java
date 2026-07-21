package com.taskpriority.project;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Area;
import com.taskpriority.model.Milestone;
import com.taskpriority.model.MilestoneStatus;
import com.taskpriority.model.Project;
import com.taskpriority.model.ProjectStatus;
import com.taskpriority.model.Role;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.Tier;
import com.taskpriority.repository.MilestoneRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProjectServiceTest {
    private static final Long USER_ID = 1L;

    private ProjectRepository projectRepository;
    private MilestoneRepository milestoneRepository;
    private TaskRepository taskRepository;
    private ProjectService projectService;

    private Project project(Long id, LocalDate targetDate) {
        Project project = new Project("Website relaunch");
        project.setId(id);
        project.setUserId(USER_ID);
        project.setTargetDate(targetDate);
        return project;
    }

    private Task task(Long id, Status status, LocalDate dueDate, Integer estimatedMinutes, Integer actualMinutes) {
        Task task = new Task("Task " + id);
        task.setId(id);
        task.setStatus(status);
        task.setDueDate(dueDate);
        task.setEstimatedMinutes(estimatedMinutes);
        task.setActualMinutes(actualMinutes);
        return task;
    }

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        milestoneRepository = mock(MilestoneRepository.class);
        taskRepository = mock(TaskRepository.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(USER_ID, "u@example.com", Tier.FREE, Role.USER));
        when(milestoneRepository.findByUserIdAndProjectIdOrderByTargetDateAscIdAsc(eq(USER_ID), any())).thenReturn(List.of());
        projectService = new ProjectService(projectRepository, milestoneRepository, taskRepository, new ProjectApiMapper(), currentUserService);
    }

    @Test
    void createSetsUserIdAndOwnerUserIdFromTheCurrentUser() {
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Project created = projectService.create(new CreateProjectRequest("Launch", null, null, null, null, null, null));

        assertEquals(USER_ID, created.getUserId());
        assertEquals(USER_ID, created.getOwnerUserId());
        assertEquals(ProjectStatus.PLANNING, created.getStatus());
    }

    @Test
    void findByIdThrowsWhenProjectDoesNotBelongToTheCurrentUser() {
        when(projectRepository.findByUserIdAndId(USER_ID, 99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.findById(99L));
    }

    @Test
    void overviewComputesProgressFromCompletedTasks() {
        Project project = project(1L, null);
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project));
        when(taskRepository.findByUserIdAndProjectId(USER_ID, 1L)).thenReturn(List.of(
                task(1L, Status.DONE, null, 60, 90),
                task(2L, Status.DONE, null, 60, 30),
                task(3L, Status.NOT_STARTED, null, 60, null),
                task(4L, Status.NOT_STARTED, null, 60, null)
        ));

        ProjectOverviewResponse overview = projectService.getOverview(1L);

        assertEquals(4, overview.totalTasks());
        assertEquals(2, overview.completedTasks());
        assertEquals(2, overview.activeTasks());
        assertEquals(50, overview.progressPercent());
        assertEquals(4.0, overview.estimatedHours(), 0.001);
        assertEquals(2.0, overview.actualHours(), 0.001);
    }

    @Test
    void overviewIsHighRiskWhenAnyActiveTaskIsOverdue() {
        Project project = project(1L, LocalDate.now().plusMonths(2));
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project));
        when(taskRepository.findByUserIdAndProjectId(USER_ID, 1L)).thenReturn(List.of(
                task(1L, Status.NOT_STARTED, LocalDate.now().minusDays(3), 60, null)
        ));

        ProjectOverviewResponse overview = projectService.getOverview(1L);

        assertEquals("HIGH", overview.riskLevel());
        assertEquals(1, overview.overdueTasks());
    }

    @Test
    void overviewIsMediumRiskWhenTargetDateIsSoonAndProgressIsLow() {
        Project project = project(1L, LocalDate.now().plusDays(3));
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project));
        when(taskRepository.findByUserIdAndProjectId(USER_ID, 1L)).thenReturn(List.of(
                task(1L, Status.NOT_STARTED, LocalDate.now().plusDays(1), 60, null),
                task(2L, Status.NOT_STARTED, LocalDate.now().plusDays(1), 60, null)
        ));

        ProjectOverviewResponse overview = projectService.getOverview(1L);

        assertEquals("MEDIUM", overview.riskLevel());
    }

    @Test
    void overviewIsLowRiskWithNoOverdueTasksAndNoImminentDeadline() {
        Project project = project(1L, LocalDate.now().plusMonths(3));
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project));
        when(taskRepository.findByUserIdAndProjectId(USER_ID, 1L)).thenReturn(List.of(
                task(1L, Status.DONE, LocalDate.now().minusDays(1), 60, 60)
        ));

        ProjectOverviewResponse overview = projectService.getOverview(1L);

        assertEquals("LOW", overview.riskLevel());
    }

    @Test
    void overviewHandlesAProjectWithNoTasksWithoutDivideByZero() {
        Project project = project(1L, null);
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project));
        when(taskRepository.findByUserIdAndProjectId(USER_ID, 1L)).thenReturn(List.of());

        ProjectOverviewResponse overview = projectService.getOverview(1L);

        assertEquals(0, overview.totalTasks());
        assertEquals(0, overview.progressPercent());
        assertEquals("LOW", overview.riskLevel());
    }

    @Test
    void createMilestoneAssignsProjectIdAndUserId() {
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project(1L, null)));
        when(milestoneRepository.save(any(Milestone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Milestone milestone = projectService.createMilestone(1L, new CreateMilestoneRequest("Beta launch", LocalDate.now().plusWeeks(2)));

        assertEquals(USER_ID, milestone.getUserId());
        assertEquals(1L, milestone.getProjectId());
        assertEquals(MilestoneStatus.PENDING, milestone.getStatus());
    }

    @Test
    void updatingMilestoneToDoneSetsCompletedDate() {
        when(projectRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(project(1L, null)));
        Milestone existing = new Milestone("Beta launch");
        existing.setId(5L);
        existing.setUserId(USER_ID);
        existing.setProjectId(1L);
        when(milestoneRepository.findByUserIdAndId(USER_ID, 5L)).thenReturn(Optional.of(existing));
        when(milestoneRepository.save(any(Milestone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Milestone updated = projectService.updateMilestone(1L, 5L, new UpdateMilestoneRequest("Beta launch", null, MilestoneStatus.DONE));

        assertEquals(MilestoneStatus.DONE, updated.getStatus());
        assertNotNull(updated.getCompletedDate());
    }

    @Test
    void deleteDoesNotThrowWhenProjectBelongsToTheCurrentUser() {
        when(projectRepository.existsByUserIdAndId(USER_ID, 1L)).thenReturn(true);

        assertDoesNotThrow(() -> projectService.delete(1L));
        verify(projectRepository).deleteById(1L);
    }

    @Test
    void deleteThrowsWhenProjectDoesNotBelongToTheCurrentUser() {
        when(projectRepository.existsByUserIdAndId(USER_ID, 99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> projectService.delete(99L));
        verify(projectRepository, never()).deleteById(any());
    }
}
