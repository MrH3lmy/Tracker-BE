package com.taskpriority.weeklyreview;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WeeklyReviewResponse(
        Long id,
        LocalDate weekStartDate,
        LocalDateTime completedAt,
        String summary,
        Long linkedNoteId,
        LocalDateTime createdDate
) {}
