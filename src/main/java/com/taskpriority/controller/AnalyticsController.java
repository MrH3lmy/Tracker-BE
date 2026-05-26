package com.taskpriority.controller;

import com.taskpriority.dashboard.DashboardService;
import com.taskpriority.model.PriorityCategory;
import com.taskpriority.planning.PlanningService;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import com.taskpriority.task.application.DuplicateDetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final TaskService taskService; private final DashboardService dashboardService; private final PlanningService planningService; private final DuplicateDetectionService duplicateDetectionService; private final TaskApiMapper mapper;
    public AnalyticsController(TaskService taskService, DashboardService dashboardService, PlanningService planningService, DuplicateDetectionService duplicateDetectionService, TaskApiMapper mapper){this.taskService=taskService;this.dashboardService=dashboardService;this.planningService=planningService;this.duplicateDetectionService=duplicateDetectionService;this.mapper=mapper;}
    @GetMapping("/matrix") public ResponseEntity<Map<PriorityCategory,List<TaskResponse>>> matrix(){return ResponseEntity.ok(taskService.getMatrixView().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,e->e.getValue().stream().map(mapper::toResponse).toList())));}    
    @GetMapping("/dashboard") public ResponseEntity<TaskService.DashboardSummary> dash(){return ResponseEntity.ok(dashboardService.getDashboardSummary());}
    @GetMapping("/today") public ResponseEntity<TaskService.TodayView> today(){return ResponseEntity.ok(planningService.getTodayView());}
    @GetMapping("/weekly-plan") public ResponseEntity<List<TaskService.DailyPlan>> weekly(){return ResponseEntity.ok(planningService.getWeeklyPlan());}
    @GetMapping("/duplicates") public ResponseEntity<List<DuplicateDetectionService.DuplicateGroup>> dup(){return ResponseEntity.ok(duplicateDetectionService.findPotentialDuplicates());}
    public record DailyPlanResponse(LocalDate date, List<TaskResponse> tasks) {}
}
