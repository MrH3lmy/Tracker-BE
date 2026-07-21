package com.taskpriority.repository;

import com.taskpriority.model.WeeklyReview;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeeklyReviewRepository extends JpaRepository<WeeklyReview, Long> {
    List<WeeklyReview> findByUserIdOrderByWeekStartDateDesc(Long userId, Pageable pageable);
    Optional<WeeklyReview> findByUserIdAndId(Long userId, Long id);
    Optional<WeeklyReview> findFirstByUserIdOrderByCompletedAtDesc(Long userId);
}
