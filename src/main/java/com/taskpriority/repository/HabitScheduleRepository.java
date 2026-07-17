package com.taskpriority.repository;

import com.taskpriority.model.HabitSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HabitScheduleRepository extends JpaRepository<HabitSchedule, Long> {
    Optional<HabitSchedule> findByHabitId(Long habitId);
    List<HabitSchedule> findByScheduledDate(LocalDate scheduledDate);
    void deleteByHabitId(Long habitId);
}
