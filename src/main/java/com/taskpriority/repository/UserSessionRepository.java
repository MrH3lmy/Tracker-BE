package com.taskpriority.repository;

import com.taskpriority.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByTokenHash(String tokenHash);

    List<UserSession> findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(Long userId, LocalDateTime now);

    long countByUserIdAndRevokedFalseAndExpiresAtAfter(Long userId, LocalDateTime now);

    List<UserSession> findByUserIdAndRevokedFalse(Long userId);
}
