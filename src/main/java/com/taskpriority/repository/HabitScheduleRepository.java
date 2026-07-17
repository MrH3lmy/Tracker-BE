package com.taskpriority.repository;

import com.taskpriority.model.HabitSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HabitScheduleRepository extends JpaRepository<HabitSchedule, Long> {
    List<HabitSchedule> findByUserId(Long userId);
    Optional<HabitSchedule> findByUserIdAndHabitId(Long userId, Long habitId);
    List<HabitSchedule> findByUserIdAndScheduledDate(Long userId, LocalDate scheduledDate);
    void deleteByUserIdAndHabitId(Long userId, Long habitId);
}
