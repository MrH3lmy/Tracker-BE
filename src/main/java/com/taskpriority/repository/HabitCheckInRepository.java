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
    int countByTaskIdAndCheckInDate(Long taskId, LocalDate checkInDate);
    List<HabitCheckIn> findByTaskIdAndCheckInDate(Long taskId, LocalDate checkInDate);
    Optional<HabitCheckIn> findTopByTaskIdAndCheckInDateOrderByCheckedInAtDesc(Long taskId, LocalDate checkInDate);
    void deleteByTaskId(Long taskId);

    @Query("SELECT h.task.id AS taskId, COUNT(h) AS checkInCount FROM HabitCheckIn h "
            + "WHERE h.task.id IN :taskIds AND h.checkInDate = :checkInDate GROUP BY h.task.id")
    List<TaskCheckInCount> countByTaskIdInAndCheckInDate(@Param("taskIds") Collection<Long> taskIds, @Param("checkInDate") LocalDate checkInDate);

    interface TaskCheckInCount {
        Long getTaskId();
        Long getCheckInCount();
    }
}
