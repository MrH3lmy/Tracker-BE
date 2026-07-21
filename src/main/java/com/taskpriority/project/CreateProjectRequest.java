package com.taskpriority.project;

import com.taskpriority.model.Area;
import com.taskpriority.model.ProjectStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateProjectRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String name,
        String description,
        ProjectStatus status,
        LocalDate startDate,
        LocalDate targetDate,
        Area area,
        String goal
) {
    @AssertTrue(message = "targetDate must be on or after startDate")
    boolean isTargetDateOnOrAfterStartDate() {
        return startDate == null || targetDate == null || !targetDate.isBefore(startDate);
    }
}
