package com.taskpriority.weeklyreview;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record CompleteWeeklyReviewRequest(
        @NotNull(message = "weekStartDate is required")
        LocalDate weekStartDate,
        @Size(max = 5000, message = "summary must be 5000 characters or fewer")
        String summary,
        Long linkedNoteId,
        @Valid
        List<TaskDecisionRequest> decisions
) {}
