package com.taskpriority.repository;

import com.taskpriority.model.HabitCheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface HabitCheckInRepository extends JpaRepository<HabitCheckIn, Long> {
    int countByHabitIdAndCheckInDate(Long habitId, LocalDate checkInDate);
    List<HabitCheckIn> findByHabitIdAndCheckInDate(Long habitId, LocalDate checkInDate);
    Optional<HabitCheckIn> findTopByHabitIdAndCheckInDateOrderByCheckedInAtDesc(Long habitId, LocalDate checkInDate);
    void deleteByHabitId(Long habitId);

    @Query("SELECT h.habit.id AS habitId, COUNT(h) AS checkInCount FROM HabitCheckIn h "
            + "WHERE h.habit.id IN :habitIds AND h.checkInDate = :checkInDate GROUP BY h.habit.id")
    List<HabitCheckInCount> countByHabitIdInAndCheckInDate(@Param("habitIds") Collection<Long> habitIds, @Param("checkInDate") LocalDate checkInDate);

    interface HabitCheckInCount {
        Long getHabitId();
        Long getCheckInCount();
    }
}
