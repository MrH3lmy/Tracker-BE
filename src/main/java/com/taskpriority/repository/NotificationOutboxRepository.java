package com.taskpriority.repository;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutboxEntry, Long> {
    List<NotificationOutboxEntry> findByStatus(NotificationStatus status);
    List<NotificationOutboxEntry> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<NotificationOutboxEntry> findByUserIdAndReadFalseOrderByCreatedDateDesc(Long userId);
    Optional<NotificationOutboxEntry> findByUserIdAndId(Long userId, Long id);
    boolean existsByReminderIdAndChannel(Long reminderId, NotificationChannel channel);
    long countByUserIdAndReadFalse(Long userId);
}
