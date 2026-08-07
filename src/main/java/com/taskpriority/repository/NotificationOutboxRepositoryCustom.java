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
     * Persists a successful delivery, but only if this worker's claim is still the authoritative
     * one for the row - enforced by requiring {@code processing_started_at} to still equal
     * {@code expectedProcessingStartedAt}, the value this worker observed at claim time. If lease
     * recovery reset and another worker reclaimed the row in the meantime (this worker was merely
     * slow, not actually dead - a "zombie" write), {@code processing_started_at} will have moved
     * on and this affects zero rows, letting the caller detect and discard its own stale outcome
     * instead of silently overwriting the replacement worker's newer state.
     *
     * @return true if this worker's claim was still current and the update applied, false if it
     *         was detected stale
     */
    boolean markDelivered(Long id, LocalDateTime expectedProcessingStartedAt, LocalDateTime processedAt);

    /**
     * Persists a retry/failure outcome under the same lease-ownership guard as
     * {@link #markDelivered}.
     *
     * @return true if this worker's claim was still current and the update applied, false if it
     *         was detected stale
     */
    boolean markDeliveryOutcome(Long id, LocalDateTime expectedProcessingStartedAt, NotificationStatus newStatus,
                                 String lastErrorCode, String lastErrorMessage, LocalDateTime nextAttemptAt);
}
