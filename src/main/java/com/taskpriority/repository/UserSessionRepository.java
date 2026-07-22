package com.taskpriority.repository;

import com.taskpriority.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByTokenHash(String tokenHash);

    List<UserSession> findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(Long userId, LocalDateTime now);

    long countByUserIdAndRevokedFalseAndExpiresAtAfter(Long userId, LocalDateTime now);

    List<UserSession> findByUserIdAndRevokedFalse(Long userId);

    /**
     * Atomically consumes (revokes) an active, unexpired session in a single conditional UPDATE.
     * Under concurrent callers presenting the same token, the database's row-level locking
     * serializes the competing UPDATEs: only the first to commit affects a row (returns 1); every
     * later one re-evaluates the WHERE clause against the now-revoked row and affects 0 rows. This
     * is what guarantees a refresh token can be rotated exactly once even under a race.
     */
    @Modifying
    @Query("UPDATE UserSession s SET s.revoked = true WHERE s.tokenHash = :tokenHash AND s.revoked = false AND s.expiresAt > :now")
    int consumeByTokenHash(String tokenHash, LocalDateTime now);
}
