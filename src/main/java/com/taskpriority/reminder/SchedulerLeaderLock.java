package com.taskpriority.reminder;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures a scheduled job runs on at most one application instance at a time, using PostgreSQL's
 * transaction-scoped advisory locks ({@code pg_try_advisory_xact_lock}). The lock is tied to the
 * current database transaction and is released automatically when that transaction commits or
 * rolls back (including on a crash) - there is no separate unlock call to forget, and no risk of
 * leaking a session-held lock onto a pooled connection that outlives this method.
 *
 * <p>Callers MUST invoke {@link #tryAcquire(long)} from within an active {@code @Transactional}
 * method (so the lock and the work it protects share one transaction/connection), and must treat
 * a {@code false} result as "another instance already holds this tick - skip and try again next
 * time", not as an error.
 */
@Component
public class SchedulerLeaderLock {
    private final JdbcTemplate jdbcTemplate;

    public SchedulerLeaderLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean tryAcquire(long lockKey) {
        Boolean acquired = jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, lockKey);
        return Boolean.TRUE.equals(acquired);
    }
}
