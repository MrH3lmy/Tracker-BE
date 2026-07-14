package com.taskpriority.scheduler;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/scheduler")
public class SchedulerController {
    private final SchedulerService schedulerService;

    public SchedulerController(SchedulerService schedulerService) {
        this.schedulerService = schedulerService;
    }

    @GetMapping("/day")
    public DayScheduleResponse day(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return schedulerService.getDaySchedule(date);
    }

    @PutMapping("/tasks/{taskId}")
    public ScheduledTaskResponse scheduleTask(@PathVariable Long taskId, @Validated @RequestBody ScheduleTaskRequest request) {
        return schedulerService.scheduleTask(taskId, request);
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> unschedule(@PathVariable Long taskId) {
        schedulerService.unschedule(taskId);
        return ResponseEntity.noContent().build();
    }
}
