package com.taskpriority.calendar;

import com.taskpriority.model.Task;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {
    private final CalendarService calendarService;
    public CalendarController(CalendarService calendarService){this.calendarService=calendarService;}
    @GetMapping("/month") public List<Task> month(@RequestParam int year,@RequestParam int month){ return calendarService.getMonth(year, month); }
    @GetMapping(value = "/export.ics", produces = "text/calendar") public ResponseEntity<String> ics(){return ResponseEntity.ok(calendarService.exportCalendar());}
}
