package com.example.taskpriority.controller;

import com.example.taskpriority.model.PriorityCategory;
import com.example.taskpriority.model.Task;
import com.example.taskpriority.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final TaskService taskService;

    public AnalyticsController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/matrix")
    public ResponseEntity<Map<PriorityCategory, List<Task>>> getMatrix() {
        return ResponseEntity.ok(taskService.getMatrixView());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<TaskService.DashboardSummary> getDashboard() {
        return ResponseEntity.ok(taskService.getDashboardSummary());
    }

    @GetMapping("/today")
    public ResponseEntity<TaskService.TodayView> getToday() {
        return ResponseEntity.ok(taskService.getTodayView());
    }

    @GetMapping("/weekly-plan")
    public ResponseEntity<List<TaskService.DailyPlan>> getWeeklyPlan() {
        return ResponseEntity.ok(taskService.getWeeklyPlan());
    }

    @GetMapping("/duplicates")
    public ResponseEntity<List<TaskService.DuplicateGroup>> getDuplicates() {
        return ResponseEntity.ok(taskService.findPotentialDuplicates());
    }

    @GetMapping("/archive")
    public ResponseEntity<List<Task>> getArchive() {
        return ResponseEntity.ok(taskService.getArchive());
    }

    @GetMapping(value = "/calendar.ics", produces = "text/calendar")
    public ResponseEntity<String> exportCalendar() {
        return ResponseEntity.ok(taskService.exportCalendar());
    }
}
