package com.taskpriority.weeklyreview;

import com.taskpriority.model.WeeklyReview;
import org.springframework.stereotype.Component;

@Component
public class WeeklyReviewApiMapper {

    public WeeklyReviewResponse toResponse(WeeklyReview review) {
        return new WeeklyReviewResponse(
                review.getId(),
                review.getWeekStartDate(),
                review.getCompletedAt(),
                review.getSummary(),
                review.getLinkedNoteId(),
                review.getCreatedDate()
        );
    }
}
