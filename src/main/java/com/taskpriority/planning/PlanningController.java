package com.taskpriority.planning;

import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/planning")
@Tag(name = "Planning", description = "Today/weekly planning views, task recommendations, and the project board")
public class PlanningController {
    private final PlanningService planningService;
    private final TaskRecommendationService taskRecommendationService;
    private final TaskApiMapper mapper;

    public PlanningController(PlanningService planningService, TaskRecommendationService taskRecommendationService, TaskApiMapper mapper){this.planningService=planningService;this.taskRecommendationService=taskRecommendationService;this.mapper=mapper;}

    @Operation(summary = "Get today's view", description = "Returns overdue tasks, tasks due today, and top-priority tasks.")
    @GetMapping("/today") public TodayViewResponse today(){ TaskService.TodayView t=planningService.getTodayView();return new TodayViewResponse(t.overdue().stream().map(mapper::toResponse).toList(),t.dueToday().stream().map(mapper::toResponse).toList(),t.topPriority().stream().map(mapper::toResponse).toList());}

    @Operation(summary = "Get the weekly plan", description = "Returns a per-day breakdown of tasks for the current week.")
    @GetMapping("/weekly") public List<DailyPlanResponse> weekly(){return planningService.getWeeklyPlan().stream().map(d->new DailyPlanResponse(d.date(),d.tasks().stream().map(mapper::toResponse).toList())).toList();}

    @Operation(summary = "Get task recommendations", description = "Heuristic suggestions for what to work on next.")
    @GetMapping("/recommendations") public List<TaskRecommendationResponse> recommendations(){return taskRecommendationService.getRecommendations();}

    @Operation(summary = "Get the project board", description = "Returns projects with their tasks arranged for a board view.")
    @GetMapping("/project-board") public ProjectPlanResponse projectBoard(){return planningService.getProjectBoard();}
    public record TodayViewResponse(List<TaskResponse> overdue,List<TaskResponse> dueToday,List<TaskResponse> topPriority){}
    public record DailyPlanResponse(LocalDate date,List<TaskResponse> tasks){}
}
