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
    int countByUserIdAndHabitIdAndCheckInDate(Long userId, Long habitId, LocalDate checkInDate);
    List<HabitCheckIn> findByUserIdAndHabitIdAndCheckInDate(Long userId, Long habitId, LocalDate checkInDate);
    Optional<HabitCheckIn> findTopByUserIdAndHabitIdAndCheckInDateOrderByCheckedInAtDesc(Long userId, Long habitId, LocalDate checkInDate);
    void deleteByUserIdAndHabitId(Long userId, Long habitId);

    @Query("SELECT h.habit.id AS habitId, COUNT(h) AS checkInCount FROM HabitCheckIn h "
            + "WHERE h.userId = :userId AND h.habit.id IN :habitIds AND h.checkInDate = :checkInDate GROUP BY h.habit.id")
    List<HabitCheckInCount> countByHabitIdInAndCheckInDate(@Param("userId") Long userId, @Param("habitIds") Collection<Long> habitIds, @Param("checkInDate") LocalDate checkInDate);

    @Query("SELECT h.habit.id AS habitId, h.checkInDate AS checkInDate, COUNT(h) AS checkInCount FROM HabitCheckIn h "
            + "WHERE h.userId = :userId AND h.habit.id IN :habitIds AND h.checkInDate BETWEEN :from AND :to GROUP BY h.habit.id, h.checkInDate")
    List<HabitCheckInDailyCount> countByHabitIdInAndCheckInDateBetween(
            @Param("userId") Long userId, @Param("habitIds") Collection<Long> habitIds, @Param("from") LocalDate from, @Param("to") LocalDate to);

    interface HabitCheckInCount {
        Long getHabitId();
        Long getCheckInCount();
    }

    interface HabitCheckInDailyCount {
        Long getHabitId();
        LocalDate getCheckInDate();
        Long getCheckInCount();
    }
}
