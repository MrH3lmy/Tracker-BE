package com.taskpriority.repository;

import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitCheckIn;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the hand-written @Query methods against a real (H2) database.
 * These are Spring Data proxy implementations with no Java bytecode of their
 * own, so unit tests that mock the repository - and coverage tools like
 * jacoco - can never actually verify the JPQL is correct.
 */
@SpringBootTest
@ActiveProfiles("local-test")
@Transactional
class HabitCheckInRepositoryTest {

    @Autowired
    private HabitRepository habitRepository;

    @Autowired
    private HabitCheckInRepository habitCheckInRepository;

    private Habit persistHabit(String title) {
        Habit habit = new Habit(title);
        habit.setArea(Area.HEALTH);
        return habitRepository.save(habit);
    }

    private void checkIn(Habit habit, LocalDate date, int times) {
        for (int i = 0; i < times; i++) {
            HabitCheckIn checkIn = new HabitCheckIn();
            checkIn.setHabit(habit);
            checkIn.setCheckInDate(date);
            habitCheckInRepository.save(checkIn);
        }
    }

    @Test
    void countByHabitIdInAndCheckInDateGroupsCountsPerHabitForExactDate() {
        Habit water = persistHabit("Drink water");
        Habit training = persistHabit("Training");
        LocalDate today = LocalDate.now();
        checkIn(water, today, 3);
        checkIn(training, today, 1);
        checkIn(water, today.minusDays(1), 5); // different day, must not be counted

        List<HabitCheckInRepository.HabitCheckInCount> rows =
                habitCheckInRepository.countByHabitIdInAndCheckInDate(List.of(water.getId(), training.getId()), today);

        Map<Long, Long> byHabit = rows.stream()
                .collect(Collectors.toMap(HabitCheckInRepository.HabitCheckInCount::getHabitId, HabitCheckInRepository.HabitCheckInCount::getCheckInCount));
        assertEquals(3L, byHabit.get(water.getId()));
        assertEquals(1L, byHabit.get(training.getId()));
    }

    @Test
    void countByHabitIdInAndCheckInDateOmitsHabitsWithNoCheckInsOnDate() {
        Habit water = persistHabit("Drink water");
        Habit training = persistHabit("Training");
        LocalDate today = LocalDate.now();
        checkIn(water, today, 2);
        // training has no check-ins today at all - must not appear in the grouped result

        List<HabitCheckInRepository.HabitCheckInCount> rows =
                habitCheckInRepository.countByHabitIdInAndCheckInDate(List.of(water.getId(), training.getId()), today);

        assertEquals(1, rows.size());
        assertEquals(water.getId(), rows.get(0).getHabitId());
    }

    @Test
    void countByHabitIdInAndCheckInDateBetweenGroupsCountsPerHabitPerDayWithinRange() {
        Habit water = persistHabit("Drink water");
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate tuesday = monday.plusDays(1);
        LocalDate nextMonday = monday.plusWeeks(1);
        checkIn(water, monday, 4);
        checkIn(water, tuesday, 2);
        checkIn(water, nextMonday, 9); // outside the requested range, must be excluded

        List<HabitCheckInRepository.HabitCheckInDailyCount> rows =
                habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(List.of(water.getId()), monday, monday.plusDays(6));

        Map<LocalDate, Long> byDate = rows.stream()
                .collect(Collectors.toMap(HabitCheckInRepository.HabitCheckInDailyCount::getCheckInDate, HabitCheckInRepository.HabitCheckInDailyCount::getCheckInCount));
        assertEquals(4L, byDate.get(monday));
        assertEquals(2L, byDate.get(tuesday));
        assertEquals(2, byDate.size());
    }

    @Test
    void countByHabitIdInAndCheckInDateBetweenReturnsEmptyWhenNoCheckInsInRange() {
        Habit water = persistHabit("Drink water");
        LocalDate farFuture = LocalDate.now().plusYears(1);
        checkIn(water, LocalDate.now(), 1);

        List<HabitCheckInRepository.HabitCheckInDailyCount> rows =
                habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(List.of(water.getId()), farFuture, farFuture.plusDays(6));

        assertTrue(rows.isEmpty());
    }
}
