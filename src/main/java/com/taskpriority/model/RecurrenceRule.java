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
    private Frequency frequency = Frequency.NONE;

    private int interval = 1;

    @ElementCollection(fetch = FetchType.EAGER)
    private List<DayOfWeek> daysOfWeek;

    private Integer dayOfMonth;

    private MonthDay annualDate;

    private LocalDate nextDueDate;

    private LocalDate lastCompletedDate;

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
}
