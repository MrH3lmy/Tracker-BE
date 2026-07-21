package com.taskpriority.project;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.Project;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Projects", description = "Projects, their tasks, and milestones")
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectApiMapper mapper;
    private final TaskApiMapper taskApiMapper;

    public ProjectController(ProjectService projectService, ProjectApiMapper mapper, TaskApiMapper taskApiMapper) {
        this.projectService = projectService;
        this.mapper = mapper;
        this.taskApiMapper = taskApiMapper;
    }

    @Operation(summary = "List all projects")
    @GetMapping
    public List<ProjectResponse> all() {
        return projectService.findAll().stream().map(mapper::toResponse).toList();
    }

    @Operation(summary = "Get a project by id")
    @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}")
    public ProjectResponse byId(@PathVariable Long id) {
        return mapper.toResponse(projectService.findById(id));
    }

    @Operation(summary = "Get a project overview", description = "Aggregate stats for the project, e.g. task counts and milestone progress.")
    @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/overview")
    public ProjectOverviewResponse overview(@PathVariable Long id) {
        return projectService.getOverview(id);
    }

    @Operation(summary = "List a project's tasks")
    @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/tasks")
    public List<TaskResponse> tasks(@PathVariable Long id) {
        return projectService.findTasks(id).stream().map(taskApiMapper::toResponse).toList();
    }

    @Operation(summary = "Create a project")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Project created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Validated @RequestBody CreateProjectRequest request) {
        Project created = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }

    @Operation(summary = "Update a project")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable Long id, @Validated @RequestBody UpdateProjectRequest request) {
        return mapper.toResponse(projectService.update(id, request));
    }

    @Operation(summary = "Delete a project")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Project deleted"),
            @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List a project's milestones")
    @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/milestones")
    public List<MilestoneResponse> milestones(@PathVariable Long id) {
        return projectService.findMilestones(id).stream().map(mapper::toResponse).toList();
    }

    @Operation(summary = "Create a milestone under a project")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Milestone created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/milestones")
    public ResponseEntity<MilestoneResponse> createMilestone(@PathVariable Long id, @Validated @RequestBody CreateMilestoneRequest request) {
        var created = projectService.createMilestone(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }

    @Operation(summary = "Update a project milestone")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Milestone updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Project or milestone not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}/milestones/{milestoneId}")
    public MilestoneResponse updateMilestone(@PathVariable Long id, @PathVariable Long milestoneId, @Validated @RequestBody UpdateMilestoneRequest request) {
        return mapper.toResponse(projectService.updateMilestone(id, milestoneId, request));
    }

    @Operation(summary = "Delete a project milestone")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Milestone deleted"),
            @ApiResponse(responseCode = "404", description = "Project or milestone not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}/milestones/{milestoneId}")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long id, @PathVariable Long milestoneId) {
        projectService.deleteMilestone(id, milestoneId);
        return ResponseEntity.noContent().build();
    }
}
