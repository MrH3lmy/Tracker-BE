package com.taskpriority.calendar;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/calendar")
@Tag(name = "Calendar", description = "Month calendar views and .ics export")
public class CalendarController {
    private final CalendarService calendarService;
    public CalendarController(CalendarService calendarService){this.calendarService=calendarService;}

    @Operation(summary = "Get a month summary", description = "Returns a per-day summary (e.g. task counts) for the given year/month.")
    @ApiResponse(responseCode = "200", description = "Day-keyed month summary", content = @Content(schema = @Schema(type = "object")))
    @GetMapping("/month") public Map<LocalDate, CalendarService.DaySummary> month(@RequestParam int year,@RequestParam int month){ return calendarService.getMonthSummary(year, month); }

    @Operation(summary = "Get a month's tasks grouped by day")
    @ApiResponse(responseCode = "200", description = "Day-keyed map of tasks", content = @Content(schema = @Schema(type = "object")))
    @GetMapping("/month/tasks") public Map<LocalDate, java.util.List<com.taskpriority.task.api.TaskResponse>> monthTasks(@RequestParam int year,@RequestParam int month){ return calendarService.getMonthTasksByDay(year, month); }

    @Operation(summary = "Export all tasks as an iCalendar file", description = "Returns a downloadable .ics file (text/calendar) containing all tasks with due dates.")
    @ApiResponse(responseCode = "200", description = "iCalendar (.ics) file contents", content = @Content(mediaType = "text/calendar", schema = @Schema(type = "string")))
    @GetMapping(value = "/export.ics", produces = "text/calendar") public ResponseEntity<String> ics(){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks-calendar.ics").body(calendarService.exportCalendar());}
}
