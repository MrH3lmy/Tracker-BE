package com.taskpriority.planning;

import java.time.LocalDate;
import java.util.List;

public record ProjectPlanResponse(
        LocalDate generatedDate,
        double dailyCapacityHours,
        int remainingWorkingDays,
        double totalEstimatedHours,
        double availableCapacityHours,
        PlanningCalendarResponse calendar,
        PlannerRiskResponse risk,
        List<PlannerColumnResponse> columns
) {}
