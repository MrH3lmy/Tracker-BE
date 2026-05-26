package com.taskpriority.dashboard;

import com.taskpriority.service.TaskService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;
    public DashboardController(DashboardService dashboardService){this.dashboardService=dashboardService;}
    @GetMapping public TaskService.DashboardSummary get(){ return dashboardService.getDashboardSummary(); }
}
