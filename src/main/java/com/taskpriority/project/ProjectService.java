package com.taskpriority.project;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Milestone;
import com.taskpriority.model.MilestoneStatus;
import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.MilestoneRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class ProjectService {
    private static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);
    private static final int AT_RISK_DUE_SOON_DAYS = 7;
    private static final int AT_RISK_PROGRESS_THRESHOLD = 80;

    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final ProjectApiMapper mapper;
    private final CurrentUserService currentUserService;

    public ProjectService(ProjectRepository projectRepository, MilestoneRepository milestoneRepository,
                           TaskRepository taskRepository, ProjectApiMapper mapper, CurrentUserService currentUserService) {
        this.projectRepository = projectRepository;
        this.milestoneRepository = milestoneRepository;
        this.taskRepository = taskRepository;
        this.mapper = mapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<Project> findAll() {
        return projectRepository.findByUserId(currentUserService.requireUserId());
    }

    @Transactional(readOnly = true)
    public Project findById(Long id) {
        Long userId = currentUserService.requireUserId();
        return projectRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Project with id " + id + " not found"));
    }

    @Transactional
    public Project create(CreateProjectRequest request) {
        Long userId = currentUserService.requireUserId();
        Project project = mapper.fromCreateRequest(request);
        project.setUserId(userId);
        project.setOwnerUserId(userId);
        return projectRepository.save(project);
    }

    @Transactional
    public Project update(Long id, UpdateProjectRequest request) {
        Project project = findById(id);
        mapper.applyUpdateRequest(project, request);
        return projectRepository.save(project);
    }

    @Transactional
    public void delete(Long id) {
        Long userId = currentUserService.requireUserId();
        if (!projectRepository.existsByUserIdAndId(userId, id)) {
            throw new ResourceNotFoundException("Project with id " + id + " not found");
        }
        // Tasks keep existing; the project_id FK is ON DELETE SET NULL (see V34 migration).
        projectRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<Task> findTasks(Long projectId) {
        Long userId = currentUserService.requireUserId();
        findById(projectId); // 404s if the project doesn't belong to this user
        return taskRepository.findByUserIdAndProjectId(userId, projectId);
    }

    @Transactional(readOnly = true)
    public List<Milestone> findMilestones(Long projectId) {
        Long userId = currentUserService.requireUserId();
        findById(projectId);
        return milestoneRepository.findByUserIdAndProjectIdOrderByTargetDateAscIdAsc(userId, projectId);
    }

    @Transactional
    public Milestone createMilestone(Long projectId, CreateMilestoneRequest request) {
        Long userId = currentUserService.requireUserId();
        findById(projectId);
        Milestone milestone = mapper.fromCreateRequest(request);
        milestone.setUserId(userId);
        milestone.setProjectId(projectId);
        return milestoneRepository.save(milestone);
    }

    @Transactional
    public Milestone updateMilestone(Long projectId, Long milestoneId, UpdateMilestoneRequest request) {
        Long userId = currentUserService.requireUserId();
        findById(projectId);
        Milestone milestone = milestoneRepository.findByUserIdAndId(userId, milestoneId)
                .filter(candidate -> candidate.getProjectId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Milestone with id " + milestoneId + " not found"));
        mapper.applyUpdateRequest(milestone, request);
        return milestoneRepository.save(milestone);
    }

    @Transactional
    public void deleteMilestone(Long projectId, Long milestoneId) {
        Long userId = currentUserService.requireUserId();
        findById(projectId);
        milestoneRepository.deleteByUserIdAndId(userId, milestoneId);
    }

    @Transactional(readOnly = true)
    public ProjectOverviewResponse getOverview(Long projectId) {
        Project project = findById(projectId);
        List<Task> tasks = findTasks(projectId);
        List<Milestone> milestones = findMilestones(projectId);

        int totalTasks = tasks.size();
        int completedTasks = (int) tasks.stream().filter(t -> t.getStatus() == Status.DONE).count();
        int activeTasks = (int) tasks.stream().filter(t -> !CLOSED_STATUSES.contains(t.getStatus())).count();
        LocalDate today = LocalDate.now();
        int overdueTasks = (int) tasks.stream()
                .filter(t -> !CLOSED_STATUSES.contains(t.getStatus()))
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(today))
                .count();
        int progressPercent = totalTasks == 0 ? 0 : (int) Math.round((completedTasks * 100.0) / totalTasks);
        double estimatedHours = tasks.stream().mapToInt(t -> t.getEstimatedMinutes() == null ? 0 : t.getEstimatedMinutes()).sum() / 60.0;
        double actualHours = tasks.stream().mapToInt(t -> t.getActualMinutes() == null ? 0 : t.getActualMinutes()).sum() / 60.0;
        int completedMilestones = (int) milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.DONE).count();

        String riskLevel;
        String riskReason;
        boolean dueSoon = project.getTargetDate() != null
                && !project.getTargetDate().isBefore(today)
                && !project.getTargetDate().isAfter(today.plusDays(AT_RISK_DUE_SOON_DAYS));
        boolean targetPassed = project.getTargetDate() != null && project.getTargetDate().isBefore(today) && progressPercent < 100;
        if (overdueTasks > 0 || targetPassed) {
            riskLevel = "HIGH";
            riskReason = overdueTasks > 0
                    ? overdueTasks + " overdue task" + (overdueTasks == 1 ? "" : "s") + " in this project"
                    : "Target date has passed with work still open";
        } else if (dueSoon && progressPercent < AT_RISK_PROGRESS_THRESHOLD) {
            riskLevel = "MEDIUM";
            riskReason = "Target date is within " + AT_RISK_DUE_SOON_DAYS + " days and progress is " + progressPercent + "%";
        } else {
            riskLevel = "LOW";
            riskReason = "On track";
        }

        return new ProjectOverviewResponse(
                mapper.toResponse(project),
                totalTasks, completedTasks, activeTasks, overdueTasks, progressPercent,
                estimatedHours, actualHours,
                milestones.stream().map(mapper::toResponse).toList(),
                completedMilestones,
                riskLevel, riskReason
        );
    }
}
