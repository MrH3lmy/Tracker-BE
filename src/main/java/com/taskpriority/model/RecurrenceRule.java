package com.taskpriority.model;

import jakarta.persistence.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;

@Entity
@Table(name = "recurrence_rules")
public class RecurrenceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Frequency frequency = Frequency.NONE;

    @Column(name = "rule_interval", nullable = false)
    private int interval = 1;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "recurrence_rule_days", joinColumns = @JoinColumn(name = "recurrence_rule_id"))
    @Column(name = "day_of_week", nullable = false)
    @Enumerated(EnumType.STRING)
    private List<DayOfWeek> daysOfWeek;

    @Column(name = "day_of_month")
    private Integer dayOfMonth;

    @Convert(converter = MonthDayStringConverter.class)
    @Column(name = "annual_date")
    private MonthDay annualDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "last_completed_date")
    private LocalDate lastCompletedDate;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    private int longestStreak = 0;

    public RecurrenceRule() {}

    public RecurrenceRule(Frequency frequency, int interval) {
        this.frequency = frequency;
        this.interval = interval;
    }

    public enum Frequency { NONE, DAILY, WEEKLY, MONTHLY, YEARLY }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Frequency getFrequency() { return frequency; }
    public void setFrequency(Frequency frequency) { this.frequency = frequency; }
    public int getInterval() { return interval; }
    public void setInterval(int interval) { this.interval = interval; }
    public List<DayOfWeek> getDaysOfWeek() { return daysOfWeek; }
    public void setDaysOfWeek(List<DayOfWeek> daysOfWeek) { this.daysOfWeek = daysOfWeek; }
    public Integer getDayOfMonth() { return dayOfMonth; }
    public void setDayOfMonth(Integer dayOfMonth) { this.dayOfMonth = dayOfMonth; }
    public MonthDay getAnnualDate() { return annualDate; }
    public void setAnnualDate(MonthDay annualDate) { this.annualDate = annualDate; }
    public LocalDate getNextDueDate() { return nextDueDate; }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; }
    public LocalDate getLastCompletedDate() { return lastCompletedDate; }
    public void setLastCompletedDate(LocalDate lastCompletedDate) { this.lastCompletedDate = lastCompletedDate; }
    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
}
