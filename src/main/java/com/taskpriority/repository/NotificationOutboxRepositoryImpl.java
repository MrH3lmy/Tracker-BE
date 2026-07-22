package com.taskpriority.repository;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class NotificationOutboxRepositoryImpl implements NotificationOutboxRepositoryCustom {
    // Implemented with a plain JdbcTemplate statement (rather than Spring Data JPA's
    // @Modifying/@Query) because the claim needs FOR UPDATE SKIP LOCKED plus a RETURNING clause
    // in one round trip, which isn't a reliably portable Spring Data JPA derived/native-query
    // pattern - raw JDBC keeps the exact intended SQL unambiguous.
    private static final String CLAIM_BATCH_SQL = """
            UPDATE notification_outbox
            SET status = 'PROCESSING', processing_started_at = ?, attempts = attempts + 1
            WHERE id IN (
                SELECT id FROM notification_outbox
                WHERE status = 'PENDING' AND next_attempt_at <= ?
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT ?
            )
            RETURNING id, user_id, reminder_id, channel, title, body, link, status, attempts,
                      max_attempts, next_attempt_at, processing_started_at, processed_at,
                      last_error_code, last_error_message, read, created_at
            """;

    private final JdbcTemplate jdbcTemplate;

    public NotificationOutboxRepositoryImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<NotificationOutboxEntry> claimBatch(LocalDateTime now, int batchSize) {
        Timestamp nowTimestamp = Timestamp.valueOf(now);
        return jdbcTemplate.query(CLAIM_BATCH_SQL, ROW_MAPPER, nowTimestamp, nowTimestamp, batchSize);
    }

    private static final RowMapper<NotificationOutboxEntry> ROW_MAPPER = (rs, rowNum) -> {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setId(rs.getLong("id"));
        entry.setUserId(rs.getLong("user_id"));
        entry.setReminderId(rs.getLong("reminder_id"));
        entry.setChannel(NotificationChannel.valueOf(rs.getString("channel")));
        entry.setTitle(rs.getString("title"));
        entry.setBody(rs.getString("body"));
        entry.setLink(rs.getString("link"));
        entry.setStatus(NotificationStatus.valueOf(rs.getString("status")));
        entry.setAttempts(rs.getInt("attempts"));
        entry.setMaxAttempts(rs.getInt("max_attempts"));
        entry.setNextAttemptAt(toLocalDateTime(rs.getTimestamp("next_attempt_at")));
        entry.setProcessingStartedAt(toLocalDateTime(rs.getTimestamp("processing_started_at")));
        entry.setProcessedAt(toLocalDateTime(rs.getTimestamp("processed_at")));
        entry.setLastErrorCode(rs.getString("last_error_code"));
        entry.setLastErrorMessage(rs.getString("last_error_message"));
        entry.setRead(rs.getBoolean("read"));
        entry.setCreatedDate(toLocalDateTime(rs.getTimestamp("created_at")));
        return entry;
    };

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
