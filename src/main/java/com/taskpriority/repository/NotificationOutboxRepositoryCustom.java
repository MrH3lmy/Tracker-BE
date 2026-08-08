package com.taskpriority.repository;

import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationOutboxRepositoryCustom {
    /**
     * Atomically claims up to {@code batchSize} due PENDING rows by flipping them to PROCESSING,
     * stamping them with {@code workerId} (see {@code WorkerIdentity}), bumping their attempt
     * count, and returning the claimed rows - all in one statement. {@code FOR UPDATE SKIP LOCKED}
     * means a second dispatcher racing this same query never blocks on rows the first already
     * claimed; it just skips them and claims whatever is left, so two dispatchers can never claim
     * the same row.
     */
    List<NotificationOutboxEntry> claimBatch(LocalDateTime now, int batchSize, String workerId);

    /**
     * Persists a successful delivery, but only if this worker's claim is still authoritative and
     * the row has not already reached a terminal outcome. The processing timestamp fences workers
     * whose lease was recovered/reclaimed, while the status guard prevents an ambiguous client-side
     * exception after a committed SENT update from being followed by a retry/failure overwrite.
     *
     * @return true if this worker's outcome was accepted, false if the claim was stale or the row
     *         had already reached a terminal state
     */
    boolean markDelivered(Long id, LocalDateTime expectedProcessingStartedAt, LocalDateTime processedAt);

    /**
     * Persists a retry/failure outcome under the same lease and terminal-state guards as
     * {@link #markDelivered}.
     *
     * @return true if this worker's outcome was accepted, false if the claim was stale or the row
     *         had already reached a terminal state
     */
    boolean markDeliveryOutcome(Long id, LocalDateTime expectedProcessingStartedAt, NotificationStatus newStatus,
                                 String lastErrorCode, String lastErrorMessage, LocalDateTime nextAttemptAt);
}
