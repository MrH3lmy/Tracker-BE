package com.taskpriority.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "weekly_reviews", indexes = {
        @Index(name = "idx_weekly_reviews_user_id", columnList = "user_id"),
        @Index(name = "idx_weekly_reviews_week_start_date", columnList = "week_start_date")
})
public class WeeklyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(name = "linked_note_id")
    private Long linkedNoteId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    public WeeklyReview() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDate getWeekStartDate() { return weekStartDate; }
    public void setWeekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public Long getLinkedNoteId() { return linkedNoteId; }
    public void setLinkedNoteId(Long linkedNoteId) { this.linkedNoteId = linkedNoteId; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}
