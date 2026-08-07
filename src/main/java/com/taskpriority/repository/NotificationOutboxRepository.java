package com.taskpriority.repository;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutboxEntry, Long>, NotificationOutboxRepositoryCustom {
    List<NotificationOutboxEntry> findByStatus(NotificationStatus status);
    List<NotificationOutboxEntry> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<NotificationOutboxEntry> findByUserIdAndReadFalseOrderByCreatedDateDesc(Long userId);
    Optional<NotificationOutboxEntry> findByUserIdAndId(Long userId, Long id);
    boolean existsByReminderIdAndChannel(Long reminderId, NotificationChannel channel);
    long countByUserIdAndReadFalse(Long userId);

    /**
     * Recovers rows stuck in PROCESSING past the lease timeout (e.g. a dispatcher crashed
     * mid-send). {@code @Modifying} queries require an active transaction to execute at all (JPA
     * throws {@code TransactionRequiredException} otherwise) - {@code @Transactional} here means
     * this is true regardless of whether the caller already has one open (it joins an existing
     * transaction, e.g. ReminderService's REQUIRES_NEW wrapper, or starts its own).
     */
    @Transactional
    @Modifying
    @Query("UPDATE NotificationOutboxEntry e SET e.status = com.taskpriority.model.NotificationStatus.PENDING, e.nextAttemptAt = :now " +
            "WHERE e.status = com.taskpriority.model.NotificationStatus.PROCESSING AND e.processingStartedAt < :leaseExpiry")
    int recoverStuckProcessing(@Param("leaseExpiry") LocalDateTime leaseExpiry, @Param("now") LocalDateTime now);
}
