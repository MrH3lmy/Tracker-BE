package com.taskpriority.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks", indexes = {
        @Index(name = "idx_tasks_status", columnList = "status"),
        @Index(name = "idx_tasks_due_date", columnList = "due_date"),
        @Index(name = "idx_tasks_follow_up_date", columnList = "follow_up_date"),
        @Index(name = "idx_tasks_created_at", columnList = "created_at"),
        @Index(name = "idx_tasks_area", columnList = "area"),
        @Index(name = "idx_tasks_effort", columnList = "effort"),
        @Index(name = "idx_tasks_important", columnList = "important"),
        @Index(name = "idx_tasks_deleted", columnList = "deleted")
})
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    @Column(name = "completed_date")
    private LocalDateTime completedDate;

    @Column(nullable = false)
    private boolean important;

    @Column(nullable = false)
    private boolean deleted;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.BACKLOG;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Area area = Area.PERSONAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Effort effort = Effort.MEDIUM;

    @Column(name = "blocked_reason")
    private String blockedReason;

    @Column(name = "waiting_on")
    private String waitingOn;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "recurrence_rule_id")
    private RecurrenceRule recurrenceRule;

    @Transient
    private int priorityScore;

    @Transient
    private PriorityCategory priorityCategory;

    @Transient
    private AgeFlag ageFlag;

    @Transient
    private Integer daysLeft;

    @Transient
    private boolean overdue;

    @Transient
    private boolean urgent;

    @Transient
    private String priorityReason;

    public Task() {}
    public Task(@NotBlank String title) { this.title = title; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public LocalDateTime getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDateTime completedDate) { this.completedDate = completedDate; }
    public boolean isImportant() { return important; }
    public void setImportant(boolean important) { this.important = important; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public Effort getEffort() { return effort; }
    public void setEffort(Effort effort) { this.effort = effort; }
    public String getBlockedReason() { return blockedReason; }
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }
    public String getWaitingOn() { return waitingOn; }
    public void setWaitingOn(String waitingOn) { this.waitingOn = waitingOn; }
    public LocalDate getFollowUpDate() { return followUpDate; }
    public void setFollowUpDate(LocalDate followUpDate) { this.followUpDate = followUpDate; }
    public RecurrenceRule getRecurrenceRule() { return recurrenceRule; }
    public void setRecurrenceRule(RecurrenceRule recurrenceRule) { this.recurrenceRule = recurrenceRule; }
    public int getPriorityScore() { return priorityScore; }
    public void setPriorityScore(int priorityScore) { this.priorityScore = priorityScore; }
    public PriorityCategory getPriorityCategory() { return priorityCategory; }
    public void setPriorityCategory(PriorityCategory priorityCategory) { this.priorityCategory = priorityCategory; }
    public AgeFlag getAgeFlag() { return ageFlag; }
    public void setAgeFlag(AgeFlag ageFlag) { this.ageFlag = ageFlag; }
    public Integer getDaysLeft() { return daysLeft; }
    public void setDaysLeft(Integer daysLeft) { this.daysLeft = daysLeft; }
    public boolean isOverdue() { return overdue; }
    public void setOverdue(boolean overdue) { this.overdue = overdue; }
    public boolean isUrgent() { return urgent; }
    public void setUrgent(boolean urgent) { this.urgent = urgent; }
    public String getPriorityReason() { return priorityReason; }
    public void setPriorityReason(String priorityReason) { this.priorityReason = priorityReason; }
}
