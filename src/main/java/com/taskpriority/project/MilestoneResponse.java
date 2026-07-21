package com.taskpriority.project;

import com.taskpriority.model.MilestoneStatus;

import java.time.LocalDate;

public record MilestoneResponse(
        Long id,
        Long projectId,
        String title,
        LocalDate targetDate,
        LocalDate completedDate,
        MilestoneStatus status
) {
}
