package com.taskpriority.dashboard;

import com.taskpriority.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Aggregate task-tracker summary metrics")
public class DashboardController {
    private final DashboardService dashboardService;
    public DashboardController(DashboardService dashboardService){this.dashboardService=dashboardService;}

    @Operation(summary = "Get the dashboard summary", description = "Aggregate counts and metrics across tasks (e.g. by status, priority, and due date).")
    @GetMapping public TaskService.DashboardSummary get(){ return dashboardService.getDashboardSummary(); }
}
