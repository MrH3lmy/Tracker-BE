package com.taskpriority.repository;

import com.taskpriority.model.FocusSessionPause;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FocusSessionPauseRepository extends JpaRepository<FocusSessionPause, Long> {
    List<FocusSessionPause> findBySessionIdOrderByPausedAtAsc(Long sessionId);
    Optional<FocusSessionPause> findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(Long sessionId);
}
