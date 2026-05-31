package com.taskpriority.planning;

import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/planning")
public class PlanningController {
    private final PlanningService planningService;
    private final TaskRecommendationService taskRecommendationService;
    private final TaskApiMapper mapper;

    public PlanningController(PlanningService planningService, TaskRecommendationService taskRecommendationService, TaskApiMapper mapper){this.planningService=planningService;this.taskRecommendationService=taskRecommendationService;this.mapper=mapper;}
    @GetMapping("/today") public TodayViewResponse today(){ TaskService.TodayView t=planningService.getTodayView();return new TodayViewResponse(t.overdue().stream().map(mapper::toResponse).toList(),t.dueToday().stream().map(mapper::toResponse).toList(),t.topPriority().stream().map(mapper::toResponse).toList());}
    @GetMapping("/weekly") public List<DailyPlanResponse> weekly(){return planningService.getWeeklyPlan().stream().map(d->new DailyPlanResponse(d.date(),d.tasks().stream().map(mapper::toResponse).toList())).toList();}
    @GetMapping("/recommendations") public List<TaskRecommendationResponse> recommendations(){return taskRecommendationService.getRecommendations();}
    public record TodayViewResponse(List<TaskResponse> overdue,List<TaskResponse> dueToday,List<TaskResponse> topPriority){}
    public record DailyPlanResponse(LocalDate date,List<TaskResponse> tasks){}
}
