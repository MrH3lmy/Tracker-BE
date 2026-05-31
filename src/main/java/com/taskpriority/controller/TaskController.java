package com.taskpriority.controller;

import com.taskpriority.model.Task;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.CreateTaskRequest;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import com.taskpriority.task.api.UpdateTaskRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;

    public TaskController(TaskService taskService, TaskApiMapper taskApiMapper) {
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks() {
        return ResponseEntity.ok(taskService.findAll().stream().map(taskApiMapper::toResponse).toList());
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Validated @RequestBody CreateTaskRequest request) {
        Task saved = taskService.save(taskApiMapper.fromCreateRequest(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(taskApiMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Validated @RequestBody UpdateTaskRequest request) {
        Task saved = taskService.updateTask(id, request);
        return ResponseEntity.ok(taskApiMapper.toResponse(saved));
    }
}
