package com.taskpriority.project;

import com.taskpriority.model.Area;
import com.taskpriority.model.ProjectStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        ProjectStatus status,
        LocalDate startDate,
        LocalDate targetDate,
        Area area,
        String goal,
        Long ownerUserId,
        LocalDateTime createdDate
) {
}
