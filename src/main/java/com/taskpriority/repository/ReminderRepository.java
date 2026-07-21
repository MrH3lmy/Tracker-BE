package com.taskpriority.repository;

import com.taskpriority.model.Reminder;
import com.taskpriority.model.ReminderKind;
import com.taskpriority.model.ReminderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    Optional<Reminder> findByUserIdAndId(Long userId, Long id);
    List<Reminder> findByStatusAndScheduledForLessThanEqual(ReminderStatus status, LocalDateTime scheduledFor);
    boolean existsByUserIdAndKindAndReferenceIdAndStatusInAndScheduledForBetween(
            Long userId, ReminderKind kind, Long referenceId, List<ReminderStatus> statuses, LocalDateTime from, LocalDateTime to);
}
