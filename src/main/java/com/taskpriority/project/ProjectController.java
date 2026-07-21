package com.taskpriority.project;

import com.taskpriority.model.Project;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectApiMapper mapper;
    private final TaskApiMapper taskApiMapper;

    public ProjectController(ProjectService projectService, ProjectApiMapper mapper, TaskApiMapper taskApiMapper) {
        this.projectService = projectService;
        this.mapper = mapper;
        this.taskApiMapper = taskApiMapper;
    }

    @GetMapping
    public List<ProjectResponse> all() {
        return projectService.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ProjectResponse byId(@PathVariable Long id) {
        return mapper.toResponse(projectService.findById(id));
    }

    @GetMapping("/{id}/overview")
    public ProjectOverviewResponse overview(@PathVariable Long id) {
        return projectService.getOverview(id);
    }

    @GetMapping("/{id}/tasks")
    public List<TaskResponse> tasks(@PathVariable Long id) {
        return projectService.findTasks(id).stream().map(taskApiMapper::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Validated @RequestBody CreateProjectRequest request) {
        Project created = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable Long id, @Validated @RequestBody UpdateProjectRequest request) {
        return mapper.toResponse(projectService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/milestones")
    public List<MilestoneResponse> milestones(@PathVariable Long id) {
        return projectService.findMilestones(id).stream().map(mapper::toResponse).toList();
    }

    @PostMapping("/{id}/milestones")
    public ResponseEntity<MilestoneResponse> createMilestone(@PathVariable Long id, @Validated @RequestBody CreateMilestoneRequest request) {
        var created = projectService.createMilestone(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }

    @PutMapping("/{id}/milestones/{milestoneId}")
    public MilestoneResponse updateMilestone(@PathVariable Long id, @PathVariable Long milestoneId, @Validated @RequestBody UpdateMilestoneRequest request) {
        return mapper.toResponse(projectService.updateMilestone(id, milestoneId, request));
    }

    @DeleteMapping("/{id}/milestones/{milestoneId}")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long id, @PathVariable Long milestoneId) {
        projectService.deleteMilestone(id, milestoneId);
        return ResponseEntity.noContent().build();
    }
}
