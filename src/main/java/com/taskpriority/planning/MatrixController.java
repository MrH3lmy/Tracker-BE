package com.taskpriority.planning;

import com.taskpriority.model.PriorityCategory;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/matrix")
@Tag(name = "Matrix", description = "Eisenhower-style priority matrix view of tasks")
public class MatrixController {
    private final TaskService taskService; private final TaskApiMapper mapper;
    public MatrixController(TaskService taskService, TaskApiMapper mapper){this.taskService=taskService;this.mapper=mapper;}

    @Operation(summary = "Get the priority matrix", description = "Groups tasks by priority quadrant (e.g. urgent/important).")
    @ApiResponse(responseCode = "200", description = "Tasks grouped by priority category", content = @Content(schema = @Schema(type = "object")))
    @GetMapping public Map<PriorityCategory, List<TaskResponse>> get(){return taskService.getMatrixView().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,e->e.getValue().stream().map(mapper::toResponse).toList()));}
}
