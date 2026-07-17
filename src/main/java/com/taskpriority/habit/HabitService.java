package com.taskpriority.habit;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Habit;
import com.taskpriority.model.HabitCheckIn;
import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.task.application.RecurrenceMath;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class HabitService {
    private final HabitRepository habitRepository;
    private final HabitCheckInRepository habitCheckInRepository;

    public HabitService(HabitRepository habitRepository, HabitCheckInRepository habitCheckInRepository) {
        this.habitRepository = habitRepository;
        this.habitCheckInRepository = habitCheckInRepository;
    }

    @Transactional
    public Habit save(Habit habit) {
        Habit saved = habitRepository.save(habit);
        applyTodayProgress(saved);
        return saved;
    }

    @Transactional
    public Habit updateHabit(Long id, Habit updated) {
        return save(updated);
    }

    @Transactional(readOnly = true)
    public List<Habit> findAll() {
        List<Habit> habits = habitRepository.findAll().stream().filter(habit -> !habit.isDeleted()).toList();
        applyTodayProgressBatch(habits);
        return habits;
    }

    @Transactional(readOnly = true)
    public Habit findById(Long id) {
        Habit habit = habitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Habit with id " + id + " not found"));
        applyTodayProgress(habit);
        return habit;
    }

    @Transactional
    public void delete(Long id) {
        habitRepository.deleteById(id);
    }

    @Transactional
    public Habit checkIn(Long id) {
        Habit habit = habitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Habit with id " + id + " not found"));
        LocalDate today = LocalDate.now();

        HabitCheckIn checkIn = new HabitCheckIn();
        checkIn.setHabit(habit);
        checkIn.setCheckInDate(today);
        habitCheckInRepository.save(checkIn);

        int todayCount = habitCheckInRepository.countByHabitIdAndCheckInDate(id, today);
        RecurrenceRule rule = habit.getRecurrenceRule();
        boolean alreadyRolledOverToday = rule != null && today.equals(rule.getLastCompletedDate());

        if (rule != null && todayCount >= habit.getDailyTargetCount() && !alreadyRolledOverToday) {
            completeHabitRecurrence(habit, today);
        }

        applyTodayProgress(habit);
        return habitRepository.save(habit);
    }

    @Transactional
    public Habit undoCheckIn(Long id) {
        Habit habit = habitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Habit with id " + id + " not found"));
        habitCheckInRepository.findTopByHabitIdAndCheckInDateOrderByCheckedInAtDesc(id, LocalDate.now())
                .ifPresent(habitCheckInRepository::delete);
        applyTodayProgress(habit);
        return habitRepository.save(habit);
    }

    private void completeHabitRecurrence(Habit habit, LocalDate completionDate) {
        RecurrenceRule rule = habit.getRecurrenceRule();
        LocalDate previousDueDate = rule.getNextDueDate();
        LocalDate nextDueDate = RecurrenceMath.computeNextDueDate(rule, completionDate);
        rule.setLastCompletedDate(completionDate);
        rule.setNextDueDate(nextDueDate);
        RecurrenceMath.updateStreak(rule, previousDueDate, completionDate);
    }

    public void applyTodayProgress(Habit habit) {
        if (habit.getId() == null) {
            habit.setTodayCheckInCount(0);
            habit.setTodayTargetMet(false);
            return;
        }
        int todayCount = habitCheckInRepository.countByHabitIdAndCheckInDate(habit.getId(), LocalDate.now());
        habit.setTodayCheckInCount(todayCount);
        habit.setTodayTargetMet(todayCount >= habit.getDailyTargetCount());
    }

    @Transactional(readOnly = true)
    public List<HabitCheckInRepository.HabitCheckInDailyCount> history(LocalDate from, LocalDate to) {
        List<Long> ids = habitRepository.findAll().stream()
                .filter(habit -> !habit.isDeleted())
                .map(Habit::getId)
                .toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return habitCheckInRepository.countByHabitIdInAndCheckInDateBetween(ids, from, to);
    }

    public void applyTodayProgressBatch(List<Habit> habits) {
        List<Long> ids = habits.stream().map(Habit::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, Integer> countsByHabit = habitCheckInRepository.countByHabitIdInAndCheckInDate(ids, LocalDate.now()).stream()
                .collect(Collectors.toMap(HabitCheckInRepository.HabitCheckInCount::getHabitId, row -> row.getCheckInCount().intValue()));
        for (Habit habit : habits) {
            if (habit.getId() == null) {
                continue;
            }
            int todayCount = countsByHabit.getOrDefault(habit.getId(), 0);
            habit.setTodayCheckInCount(todayCount);
            habit.setTodayTargetMet(todayCount >= habit.getDailyTargetCount());
        }
    }
}
