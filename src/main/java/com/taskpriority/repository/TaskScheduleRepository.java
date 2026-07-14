package com.taskpriority.repository;

import com.taskpriority.model.TaskSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskScheduleRepository extends JpaRepository<TaskSchedule, Long> {
    Optional<TaskSchedule> findByTaskId(Long taskId);
    List<TaskSchedule> findByScheduledDate(LocalDate scheduledDate);
    void deleteByTaskId(Long taskId);
}
