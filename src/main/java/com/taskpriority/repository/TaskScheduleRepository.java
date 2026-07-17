package com.taskpriority.repository;

import com.taskpriority.model.TaskSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskScheduleRepository extends JpaRepository<TaskSchedule, Long> {
    List<TaskSchedule> findByUserId(Long userId);
    Optional<TaskSchedule> findByUserIdAndTaskId(Long userId, Long taskId);
    List<TaskSchedule> findByUserIdAndScheduledDate(Long userId, LocalDate scheduledDate);
    void deleteByUserIdAndTaskId(Long userId, Long taskId);
}
