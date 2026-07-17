package com.taskpriority.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "habits", indexes = {
        @Index(name = "idx_habits_area", columnList = "area"),
        @Index(name = "idx_habits_deleted", columnList = "deleted")
})
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Area area = Area.PERSONAL;

    @Column(nullable = false)
    private boolean important;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "daily_target_count", nullable = false)
    private int dailyTargetCount = 1;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "reminder_enabled", nullable = false)
    private boolean reminderEnabled;

    @Column(name = "reminder_time")
    private LocalTime reminderTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "recurrence_rule_id")
    private RecurrenceRule recurrenceRule;

    @Transient
    private int todayCheckInCount;

    @Transient
    private boolean todayTargetMet;

    public Habit() {}
    public Habit(@NotBlank String title) { this.title = title; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public boolean isImportant() { return important; }
    public void setImportant(boolean important) { this.important = important; }
    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }
    public int getDailyTargetCount() { return dailyTargetCount; }
    public void setDailyTargetCount(int dailyTargetCount) { this.dailyTargetCount = dailyTargetCount; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public boolean isReminderEnabled() { return reminderEnabled; }
    public void setReminderEnabled(boolean reminderEnabled) { this.reminderEnabled = reminderEnabled; }
    public LocalTime getReminderTime() { return reminderTime; }
    public void setReminderTime(LocalTime reminderTime) { this.reminderTime = reminderTime; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public RecurrenceRule getRecurrenceRule() { return recurrenceRule; }
    public void setRecurrenceRule(RecurrenceRule recurrenceRule) { this.recurrenceRule = recurrenceRule; }
    public int getTodayCheckInCount() { return todayCheckInCount; }
    public void setTodayCheckInCount(int todayCheckInCount) { this.todayCheckInCount = todayCheckInCount; }
    public boolean isTodayTargetMet() { return todayTargetMet; }
    public void setTodayTargetMet(boolean todayTargetMet) { this.todayTargetMet = todayTargetMet; }
}
