package com.taskpriority.task.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.Area;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.service.TaskService;
import com.taskpriority.service.BlockerAnalysisService;
import com.taskpriority.notes.NoteService;
import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.task.application.DuplicateDetectionService;
import com.taskpriority.task.application.TodayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks")
@Tag(name = "Tasks", description = "Task CRUD, status transitions, recurrence completion, subtasks, and dependencies")
public class TaskControllerV1 {
    // Server-enforced pagination bounds for the task listing/archive endpoints (issue #260) - a
    // client can request a smaller page but never an unbounded or excessively large one. Default
    // sort is the same (position, id) tiebreaker every other position-ordered task query in this
    // repo already uses, so ordering is deterministic across pages even when many tasks share a
    // position.
    static final int DEFAULT_PAGE_SIZE = 200;
    static final int MAX_PAGE_SIZE = 500;
    private static final Sort DEFAULT_TASK_SORT = Sort.by(Sort.Order.asc("position"), Sort.Order.asc("id"));

    private final TaskService taskService;
    private final TaskApiMapper mapper;
    private final DuplicateDetectionService duplicateDetectionService;
    private final BlockerAnalysisService blockerAnalysisService;
    private final NoteService noteService;
    private final TodayService todayService;

    public TaskControllerV1(TaskService taskService, TaskApiMapper mapper, DuplicateDetectionService duplicateDetectionService, BlockerAnalysisService blockerAnalysisService, NoteService noteService, TodayService todayService) {
        this.taskService = taskService; this.mapper = mapper; this.duplicateDetectionService = duplicateDetectionService; this.blockerAnalysisService = blockerAnalysisService; this.noteService = noteService; this.todayService = todayService;
    }

    @Operation(summary = "Get today's actionable tasks", description = "Overdue incomplete tasks, tasks due today, and tasks scheduled (start date) for today - excludes completed tasks and tasks belonging to another user. Deterministically ordered: overdue, then due-today, then scheduled-today, each group sorted by priority score, due date, then id.")
    @GetMapping("/today")
    public TodayResponse today() {
        return todayService.getToday();
    }

    @Operation(summary = "List tasks", description = "Paginated and filtered at the database level. Page metadata (total count/pages, current page/size, hasNext) is returned in X-Total-Count/X-Total-Pages/X-Page/X-Page-Size/X-Has-Next response headers rather than the JSON body, so the body stays a plain array for backward compatibility with existing clients. size is capped server-side at " + MAX_PAGE_SIZE + " regardless of what's requested.")
    @GetMapping
    public ResponseEntity<List<TaskResponse>> all(
            @Parameter(description = "Zero-based page index") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, capped at " + MAX_PAGE_SIZE) @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @Parameter(description = "Filter by one or more statuses") @RequestParam(required = false) List<Status> status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long boardColumnId,
            @RequestParam(required = false) Area area,
            @RequestParam(required = false) RiskLevel riskLevel,
            @Parameter(description = "Inclusive due-date range start (yyyy-MM-dd)") @RequestParam(required = false) LocalDate dueDateFrom,
            @Parameter(description = "Inclusive due-date range end (yyyy-MM-dd)") @RequestParam(required = false) LocalDate dueDateTo,
            @Parameter(description = "Case-insensitive title substring search") @RequestParam(required = false) String search
    ) {
        Page<Task> result = taskService.findPage(status, projectId, boardColumnId, area, riskLevel, dueDateFrom, dueDateTo, search, pageable(page, size));
        return pagedResponse(result);
    }

    @Operation(summary = "Get a task by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task found"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public TaskResponse byId(@PathVariable Long id){ return mapper.toResponse(taskService.findById(id)); }

    @Operation(summary = "Get a task with its notes, screenshots, and linked notes", description = "Aggregates the task plus everything from the notes subsystem that references it.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task detail found"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}/detail")
    public TaskDetailResponse detail(@PathVariable Long id){ TaskResponse task = mapper.toResponse(taskService.findById(id)); return new TaskDetailResponse(task, noteService.findByTaskId(id), noteService.findTaskScreenshots(id), noteService.findLinkedNotesForTask(id)); }

    @Operation(summary = "Create a task", description = "Optionally sets initial dependencies via dependencyIds.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Task created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<TaskResponse> create(@Validated @RequestBody CreateTaskRequest r){ Task s=taskService.save(mapper.fromCreateRequest(r)); if (r.dependencyIds() != null) { s = taskService.replaceDependencies(s.getId(), r.dependencyIds()); } return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(s));}

    @Operation(summary = "Update a task")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id,@Validated @RequestBody UpdateTaskRequest r){return mapper.toResponse(taskService.updateTask(id,r));}

    @Operation(summary = "Delete a task")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Task deleted"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){taskService.delete(id);return ResponseEntity.noContent().build();}

    @Operation(summary = "Mark a task complete", description = "Non-recurring tasks are set to DONE with a completedDate. Recurring tasks compute the next due date and reset the same task row back to NOT_STARTED instead of creating a new instance.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task completed or reset for its next occurrence"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/complete")
    public TaskResponse complete(@PathVariable Long id){return mapper.toResponse(taskService.markComplete(id));}

    @Operation(summary = "Change a task's status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated"),
            @ApiResponse(responseCode = "400", description = "Invalid status value", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/status")
    public TaskResponse status(@PathVariable Long id,@RequestParam Status status){return mapper.toResponse(taskService.updateStatus(id,status));}

    @Operation(summary = "Move a task between board columns/status", description = "Used for drag-and-drop reordering on the task board.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task moved"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/move")
    public TaskResponse move(@PathVariable Long id,@Validated @RequestBody MoveTaskRequest request){return mapper.toResponse(taskService.moveTask(id, request.status(), request.boardColumnId(), request.position()));}

    @Operation(summary = "List a task's subtasks")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Subtasks listed"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}/subtasks")
    public List<TaskResponse> subtasks(@PathVariable Long id){return taskService.findSubtasks(id).stream().map(mapper::toResponse).toList();}

    @Operation(summary = "List the notes linked to a task")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Notes listed"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}/notes")
    public List<NoteResponse> notes(@PathVariable Long id){return noteService.findByTaskId(id);}

    @Operation(summary = "Create a subtask under a task", description = "Optionally sets initial dependencies via dependencyIds.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Subtask created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Parent task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/subtasks")
    public ResponseEntity<TaskResponse> createSubtask(@PathVariable Long id,@Validated @RequestBody CreateTaskRequest r){ Task s=taskService.createSubtask(id, mapper.fromCreateRequest(r)); if (r.dependencyIds() != null) { s = taskService.replaceDependencies(s.getId(), r.dependencyIds()); } return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(s));}

    @Operation(summary = "Change a task's parent", description = "Pass a null parentTaskId to detach the task and make it top-level.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Parent updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task or parent task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/parent")
    public TaskResponse updateParent(@PathVariable Long id,@Validated @RequestBody UpdateTaskParentRequest request){return mapper.toResponse(taskService.updateParent(id, request.parentTaskId()));}

    @Operation(summary = "Change a task's project", description = "Pass a null projectId to remove the task from its project.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task or project not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/project")
    public TaskResponse updateProject(@PathVariable Long id,@Validated @RequestBody UpdateTaskProjectRequest request){return mapper.toResponse(taskService.updateProject(id, request.projectId()));}

    @Operation(summary = "Change a task's due date")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Due date updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/due-date")
    public TaskResponse updateDueDate(@PathVariable Long id,@Validated @RequestBody UpdateTaskDueDateRequest request){return mapper.toResponse(taskService.updateDueDate(id, request.dueDate()));}

    @Operation(summary = "List archived (DONE/CANCELLED) tasks", description = "Paginated the same way as the main listing endpoint - see its description for the header-based page metadata contract.")
    @GetMapping("/archive")
    public ResponseEntity<List<TaskResponse>> archive(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size
    ) {
        return pagedResponse(taskService.findArchivePage(pageable(page, size)));
    }

    @Operation(summary = "Find potential duplicate tasks", description = "Heuristic grouping of tasks that look like duplicates of one another.")
    @GetMapping("/duplicates")
    public List<DuplicateDetectionService.DuplicateGroup> duplicates(){ return duplicateDetectionService.findPotentialDuplicates(); }

    @Operation(summary = "Analyze blocking dependencies across tasks")
    @GetMapping("/blockers")
    public BlockerAnalysisService.BlockerAnalysis blockers(){ return blockerAnalysisService.analyze(); }

    @Operation(summary = "Add a dependency to a task", description = "Marks the given task as blocked by another task.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dependency added"),
            @ApiResponse(responseCode = "400", description = "Validation error, e.g. a cyclic dependency", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/dependencies")
    public TaskResponse addDependency(@PathVariable Long id, @Validated @RequestBody DependencyRequest request){ return mapper.toResponse(taskService.addDependency(id, request)); }

    @Operation(summary = "Remove a dependency from a task")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dependency removed"),
            @ApiResponse(responseCode = "404", description = "Task, blocking task, or dependency not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}/dependencies/{blocksTaskId}")
    public TaskResponse removeDependency(@PathVariable Long id, @PathVariable Long blocksTaskId){ return mapper.toResponse(taskService.removeDependency(id, blocksTaskId)); }

    private static Pageable pageable(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(safePage, safeSize, DEFAULT_TASK_SORT);
    }

    private ResponseEntity<List<TaskResponse>> pagedResponse(Page<Task> result) {
        List<TaskResponse> body = result.getContent().stream().map(mapper::toResponse).toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .header("X-Total-Pages", String.valueOf(result.getTotalPages()))
                .header("X-Page", String.valueOf(result.getNumber()))
                .header("X-Page-Size", String.valueOf(result.getSize()))
                .header("X-Has-Next", String.valueOf(result.hasNext()))
                .body(body);
    }
}
