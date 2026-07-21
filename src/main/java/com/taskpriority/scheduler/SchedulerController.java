package com.taskpriority.scheduler;

import com.taskpriority.common.exception.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/scheduler")
@Tag(name = "Scheduler", description = "Day/week working-calendar schedules, and slot suggestion/auto-scheduling for tasks and habits")
public class SchedulerController {
    private final SchedulerService schedulerService;
    private final ScheduleSuggestionService suggestionService;

    public SchedulerController(SchedulerService schedulerService, ScheduleSuggestionService suggestionService) {
        this.schedulerService = schedulerService;
        this.suggestionService = suggestionService;
    }

    @Operation(summary = "Get a day's schedule")
    @GetMapping("/day")
    public DayScheduleResponse day(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return schedulerService.getDaySchedule(date);
    }

    @Operation(summary = "Get a week's schedule", description = "Returns the 7-day schedule starting from the given date.")
    @GetMapping("/week")
    public WeekScheduleResponse week(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        return schedulerService.getWeekSchedule(startDate);
    }

    @Operation(summary = "Schedule a task into a time slot")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task scheduled"),
            @ApiResponse(responseCode = "400", description = "Validation error, e.g. a conflicting slot", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/tasks/{taskId}")
    public ScheduledTaskResponse scheduleTask(@PathVariable Long taskId, @Validated @RequestBody ScheduleTaskRequest request) {
        return schedulerService.scheduleTask(taskId, request);
    }

    @Operation(summary = "Remove a task's scheduled slot")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Task unscheduled"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> unschedule(@PathVariable Long taskId) {
        schedulerService.unschedule(taskId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Schedule a habit into a time slot")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Habit scheduled"),
            @ApiResponse(responseCode = "400", description = "Validation error, e.g. a conflicting slot", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/habits/{habitId}")
    public ScheduledHabitResponse scheduleHabit(@PathVariable Long habitId, @Validated @RequestBody ScheduleHabitRequest request) {
        return schedulerService.scheduleHabit(habitId, request);
    }

    @Operation(summary = "Remove a habit's scheduled slot")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Habit unscheduled"),
            @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/habits/{habitId}")
    public ResponseEntity<Void> unscheduleHabit(@PathVariable Long habitId) {
        schedulerService.unscheduleHabit(habitId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Suggest a time slot for a task", description = "Returns the earliest available slot at or after the optional earliestDate.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Suggested slot found"),
            @ApiResponse(responseCode = "204", description = "No available slot could be suggested"),
            @ApiResponse(responseCode = "404", description = "Task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/tasks/{taskId}/suggestion")
    public ResponseEntity<SuggestedSlot> suggestForTask(@PathVariable Long taskId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate earliestDate) {
        return suggestionService.suggestForTask(taskId, earliestDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Suggest a time slot for a habit", description = "Returns the earliest available slot at or after the optional earliestDate.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Suggested slot found"),
            @ApiResponse(responseCode = "204", description = "No available slot could be suggested"),
            @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/habits/{habitId}/suggestion")
    public ResponseEntity<SuggestedSlot> suggestForHabit(@PathVariable Long habitId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate earliestDate) {
        return suggestionService.suggestForHabit(habitId, earliestDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Auto-schedule tasks and/or habits over a date range", description = "Bulk-fills available slots between startDate and endDate for the requested scope.")
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @PostMapping("/auto-schedule")
    public AutoScheduleResult autoSchedule(@Validated @RequestBody AutoScheduleRequest request) {
        return suggestionService.autoSchedule(request.startDate(), request.endDate(), request.resolvedScope());
    }
}
