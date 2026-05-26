package com.example.taskpriority.controller;

import com.example.taskpriority.model.Task;
import com.example.taskpriority.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskService.findAll());
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Validated @RequestBody Task task) {
        Task saved = taskService.save(task);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @Validated @RequestBody Task task) {
        if (task.getId() == null || !task.getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }
        Task saved = taskService.save(task);
        return ResponseEntity.ok(saved);
    }
}
