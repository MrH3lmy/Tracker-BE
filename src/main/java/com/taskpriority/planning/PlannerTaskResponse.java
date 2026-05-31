package com.taskpriority.planning;

import com.taskpriority.model.Status;

import java.time.LocalDate;
import java.util.List;

public record PlannerTaskResponse(
        Long id,
        String title,
        Status status,
        String track,
        String phase,
        LocalDate startDate,
        LocalDate dueDate,
        Integer estimatedMinutes,
        double estimatedHours,
        PlannerRiskResponse risk,
        List<Long> dependencyIds,
        List<Long> blockingTaskIds,
        List<String> blockers
) {}
