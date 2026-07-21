package com.taskpriority.repository;

import com.taskpriority.model.FocusSession;
import com.taskpriority.model.FocusSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {
    Optional<FocusSession> findByUserIdAndId(Long userId, Long id);
    Optional<FocusSession> findFirstByUserIdAndStatusIn(Long userId, List<FocusSessionStatus> statuses);
    List<FocusSession> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(Long userId, LocalDateTime from, LocalDateTime to);
}
