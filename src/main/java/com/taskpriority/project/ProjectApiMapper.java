package com.taskpriority.project;

import com.taskpriority.model.Milestone;
import com.taskpriority.model.Project;
import com.taskpriority.model.ProjectStatus;
import org.springframework.stereotype.Component;

@Component
public class ProjectApiMapper {

    public Project fromCreateRequest(CreateProjectRequest request) {
        Project project = new Project();
        applyCommonFields(project, request.name(), request.description(), request.status(), request.startDate(),
                request.targetDate(), request.area(), request.goal());
        return project;
    }

    public void applyUpdateRequest(Project existing, UpdateProjectRequest request) {
        applyCommonFields(existing, request.name(), request.description(), request.status(), request.startDate(),
                request.targetDate(), request.area(), request.goal());
    }

    private void applyCommonFields(Project project, String name, String description, ProjectStatus status,
                                    java.time.LocalDate startDate, java.time.LocalDate targetDate,
                                    com.taskpriority.model.Area area, String goal) {
        project.setName(name);
        project.setDescription(description);
        if (status != null) project.setStatus(status);
        project.setStartDate(startDate);
        project.setTargetDate(targetDate);
        project.setArea(area);
        project.setGoal(goal);
    }

    public ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getStatus(),
                project.getStartDate(),
                project.getTargetDate(),
                project.getArea(),
                project.getGoal(),
                project.getOwnerUserId(),
                project.getCreatedDate()
        );
    }

    public Milestone fromCreateRequest(CreateMilestoneRequest request) {
        Milestone milestone = new Milestone();
        milestone.setTitle(request.title());
        milestone.setTargetDate(request.targetDate());
        return milestone;
    }

    public void applyUpdateRequest(Milestone existing, UpdateMilestoneRequest request) {
        existing.setTitle(request.title());
        existing.setTargetDate(request.targetDate());
        if (request.status() != null) {
            existing.setStatus(request.status());
            if (request.status() == com.taskpriority.model.MilestoneStatus.DONE && existing.getCompletedDate() == null) {
                existing.setCompletedDate(java.time.LocalDate.now());
            } else if (request.status() != com.taskpriority.model.MilestoneStatus.DONE) {
                existing.setCompletedDate(null);
            }
        }
    }

    public MilestoneResponse toResponse(Milestone milestone) {
        return new MilestoneResponse(
                milestone.getId(),
                milestone.getProjectId(),
                milestone.getTitle(),
                milestone.getTargetDate(),
                milestone.getCompletedDate(),
                milestone.getStatus()
        );
    }
}
