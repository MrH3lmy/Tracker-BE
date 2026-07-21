package com.taskpriority.project;

import com.taskpriority.model.MilestoneStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateMilestoneRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,
        LocalDate targetDate,
        MilestoneStatus status
) {
}
