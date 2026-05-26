package com.taskpriority.calendar;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {
    private final CalendarService calendarService;
    public CalendarController(CalendarService calendarService){this.calendarService=calendarService;}
    @GetMapping("/month") public Map<LocalDate, CalendarService.DaySummary> month(@RequestParam int year,@RequestParam int month){ return calendarService.getMonthSummary(year, month); }
    @GetMapping(value = "/export.ics", produces = "text/calendar") public ResponseEntity<String> ics(){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks-calendar.ics").body(calendarService.exportCalendar());}
}
