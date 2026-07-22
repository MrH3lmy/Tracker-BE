package com.taskpriority.repository;

import com.taskpriority.model.NotificationOutboxEntry;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationOutboxRepositoryCustom {
    /**
     * Atomically claims up to {@code batchSize} due PENDING rows by flipping them to PROCESSING,
     * bumping their attempt count, and returning the claimed rows - all in one statement.
     * {@code FOR UPDATE SKIP LOCKED} means a second dispatcher racing this same query never blocks
     * on rows the first already claimed; it just skips them and claims whatever is left, so two
     * dispatchers can never claim the same row.
     */
    List<NotificationOutboxEntry> claimBatch(LocalDateTime now, int batchSize);
}
