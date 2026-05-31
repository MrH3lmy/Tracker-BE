package com.taskpriority.planning;

import java.time.LocalDate;
import java.util.List;

public record PlanningCalendarResponse(
        List<String> excludedWeekdays,
        List<LocalDate> holidayDates
) {}
