package com.taskpriority.task.api;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.service.TaskService;
import com.taskpriority.service.BlockerAnalysisService;
import com.taskpriority.task.application.DuplicateDetectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskControllerV1 {
    private final TaskService taskService;
    private final TaskApiMapper mapper;
    private final DuplicateDetectionService duplicateDetectionService;
    private final BlockerAnalysisService blockerAnalysisService;

    public TaskControllerV1(TaskService taskService, TaskApiMapper mapper, DuplicateDetectionService duplicateDetectionService, BlockerAnalysisService blockerAnalysisService) {
        this.taskService = taskService; this.mapper = mapper; this.duplicateDetectionService = duplicateDetectionService; this.blockerAnalysisService = blockerAnalysisService;
    }

    @GetMapping public List<TaskResponse> all(){ return taskService.findAll().stream().map(mapper::toResponse).toList(); }
    @GetMapping("/{id}") public TaskResponse byId(@PathVariable Long id){ return mapper.toResponse(taskService.findById(id)); }
    @PostMapping public ResponseEntity<TaskResponse> create(@Validated @RequestBody CreateTaskRequest r){ Task s=taskService.save(mapper.fromCreateRequest(r)); if (r.dependencyIds() != null) { s = taskService.replaceDependencies(s.getId(), r.dependencyIds()); } return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(s));}
    @PutMapping("/{id}") public TaskResponse update(@PathVariable Long id,@Validated @RequestBody UpdateTaskRequest r){return mapper.toResponse(taskService.updateTask(id,r));}
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id){taskService.delete(id);return ResponseEntity.noContent().build();}
    @PatchMapping("/{id}/complete") public TaskResponse complete(@PathVariable Long id){return mapper.toResponse(taskService.markComplete(id));}
    @PatchMapping("/{id}/status") public TaskResponse status(@PathVariable Long id,@RequestParam Status status){return mapper.toResponse(taskService.updateStatus(id,status));}
    @PatchMapping("/{id}/move") public TaskResponse move(@PathVariable Long id,@Validated @RequestBody MoveTaskRequest request){return mapper.toResponse(taskService.moveTask(id, request.status(), request.boardColumnId(), request.position()));}
    @GetMapping("/archive") public List<TaskResponse> archive(){ return taskService.getArchive().stream().map(mapper::toResponse).toList(); }
    @GetMapping("/duplicates") public List<DuplicateDetectionService.DuplicateGroup> duplicates(){ return duplicateDetectionService.findPotentialDuplicates(); }
    @GetMapping("/blockers") public BlockerAnalysisService.BlockerAnalysis blockers(){ return blockerAnalysisService.analyze(); }
    @PostMapping("/{id}/dependencies") public TaskResponse addDependency(@PathVariable Long id, @Validated @RequestBody DependencyRequest request){ return mapper.toResponse(taskService.addDependency(id, request)); }
    @DeleteMapping("/{id}/dependencies/{blocksTaskId}") public TaskResponse removeDependency(@PathVariable Long id, @PathVariable Long blocksTaskId){ return mapper.toResponse(taskService.removeDependency(id, blocksTaskId)); }
}
