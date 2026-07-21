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
    private final ScheduleSuggestionService suggestionService;

    public SchedulerController(SchedulerService schedulerService, ScheduleSuggestionService suggestionService) {
        this.schedulerService = schedulerService;
        this.suggestionService = suggestionService;
    }

    @GetMapping("/day")
    public DayScheduleResponse day(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return schedulerService.getDaySchedule(date);
    }

    @GetMapping("/week")
    public WeekScheduleResponse week(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        return schedulerService.getWeekSchedule(startDate);
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

    @PutMapping("/habits/{habitId}")
    public ScheduledHabitResponse scheduleHabit(@PathVariable Long habitId, @Validated @RequestBody ScheduleHabitRequest request) {
        return schedulerService.scheduleHabit(habitId, request);
    }

    @DeleteMapping("/habits/{habitId}")
    public ResponseEntity<Void> unscheduleHabit(@PathVariable Long habitId) {
        schedulerService.unscheduleHabit(habitId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tasks/{taskId}/suggestion")
    public ResponseEntity<SuggestedSlot> suggestForTask(@PathVariable Long taskId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate earliestDate) {
        return suggestionService.suggestForTask(taskId, earliestDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/habits/{habitId}/suggestion")
    public ResponseEntity<SuggestedSlot> suggestForHabit(@PathVariable Long habitId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate earliestDate) {
        return suggestionService.suggestForHabit(habitId, earliestDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/auto-schedule")
    public AutoScheduleResult autoSchedule(@Validated @RequestBody AutoScheduleRequest request) {
        return suggestionService.autoSchedule(request.startDate(), request.endDate(), request.resolvedScope());
    }
}
