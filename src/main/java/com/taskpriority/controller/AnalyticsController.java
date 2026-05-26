package com.taskpriority.controller;

import com.taskpriority.model.PriorityCategory;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;

    public AnalyticsController(TaskService taskService, TaskApiMapper taskApiMapper) {
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
    }

    @GetMapping("/matrix")
    public ResponseEntity<Map<PriorityCategory, List<TaskResponse>>> getMatrix() {
        return ResponseEntity.ok(taskService.getMatrixView().entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey,
                        entry -> entry.getValue().stream().map(taskApiMapper::toResponse).toList())));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<TaskService.DashboardSummary> getDashboard() {
        return ResponseEntity.ok(taskService.getDashboardSummary());
    }

    @GetMapping("/today")
    public ResponseEntity<TodayViewResponse> getToday() {
        TaskService.TodayView today = taskService.getTodayView();
        return ResponseEntity.ok(new TodayViewResponse(
                today.overdue().stream().map(taskApiMapper::toResponse).toList(),
                today.dueToday().stream().map(taskApiMapper::toResponse).toList(),
                today.topPriority().stream().map(taskApiMapper::toResponse).toList()
        ));
    }

    @GetMapping("/weekly-plan")
    public ResponseEntity<List<DailyPlanResponse>> getWeeklyPlan() {
        return ResponseEntity.ok(taskService.getWeeklyPlan().stream()
                .map(dailyPlan -> new DailyPlanResponse(dailyPlan.date(),
                        dailyPlan.tasks().stream().map(taskApiMapper::toResponse).toList()))
                .toList());
    }

    @GetMapping("/duplicates")
    public ResponseEntity<List<DuplicateGroupResponse>> getDuplicates() {
        return ResponseEntity.ok(taskService.findPotentialDuplicates().stream()
                .map(group -> new DuplicateGroupResponse(group.normalizedTitle(),
                        group.tasks().stream().map(taskApiMapper::toResponse).toList()))
                .toList());
    }

    @GetMapping("/archive")
    public ResponseEntity<List<TaskResponse>> getArchive() {
        return ResponseEntity.ok(taskService.getArchive().stream().map(taskApiMapper::toResponse).toList());
    }

    @GetMapping(value = "/calendar.ics", produces = "text/calendar")
    public ResponseEntity<String> exportCalendar() {
        return ResponseEntity.ok(taskService.exportCalendar());
    }

    public record TodayViewResponse(List<TaskResponse> overdue, List<TaskResponse> dueToday, List<TaskResponse> topPriority) {}
    public record DailyPlanResponse(LocalDate date, List<TaskResponse> tasks) {}
    public record DuplicateGroupResponse(String normalizedTitle, List<TaskResponse> tasks) {}
}
