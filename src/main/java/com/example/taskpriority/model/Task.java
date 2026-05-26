package com.example.taskpriority.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;
    private String description;
    private LocalDate dueDate;
    private LocalDateTime createdDate = LocalDateTime.now();
    private LocalDateTime completedDate;
    private boolean important;

    @Enumerated(EnumType.STRING)
    private Status status = Status.BACKLOG;

    @Enumerated(EnumType.STRING)
    private Area area = Area.PERSONAL;

    @Enumerated(EnumType.STRING)
    private Effort effort = Effort.MEDIUM;

    private String blockedReason;
    private String waitingOn;
    private LocalDate followUpDate;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    private RecurrenceRule recurrenceRule;

    @Transient
    private int priorityScore;

    @Transient
    private PriorityCategory priorityCategory;

    @Transient
    private AgeFlag ageFlag;

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
}
