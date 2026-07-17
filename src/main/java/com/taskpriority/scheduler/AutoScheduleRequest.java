package com.taskpriority.scheduler;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AutoScheduleRequest(
        @NotNull(message = "startDate is required")
        LocalDate startDate,
        @NotNull(message = "endDate is required")
        LocalDate endDate,
        AutoScheduleScope scope
) {
    @AssertTrue(message = "endDate must be on or after startDate")
    boolean isEndDateOnOrAfterStartDate() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }

    public AutoScheduleScope resolvedScope() {
        return scope != null ? scope : AutoScheduleScope.ALL;
    }
}
