package com.taskpriority.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks", indexes = {
        @Index(name = "idx_tasks_status", columnList = "status"),
        @Index(name = "idx_tasks_due_date", columnList = "due_date"),
        @Index(name = "idx_tasks_follow_up_date", columnList = "follow_up_date"),
        @Index(name = "idx_tasks_created_at", columnList = "created_at"),
        @Index(name = "idx_tasks_area", columnList = "area"),
        @Index(name = "idx_tasks_effort", columnList = "effort"),
        @Index(name = "idx_tasks_important", columnList = "important"),
        @Index(name = "idx_tasks_deleted", columnList = "deleted"),
        @Index(name = "idx_tasks_board_column_id", columnList = "board_column_id"),
        @Index(name = "idx_tasks_board_column_position", columnList = "board_column_id, position"),
        @Index(name = "idx_tasks_status_position", columnList = "status, position"),
        @Index(name = "idx_tasks_start_date", columnList = "start_date"),
        @Index(name = "idx_tasks_risk_level", columnList = "risk_level"),
        @Index(name = "idx_tasks_track", columnList = "track"),
        @Index(name = "idx_tasks_phase", columnList = "phase"),
        @Index(name = "idx_tasks_parent_task_id", columnList = "parent_task_id"),
        @Index(name = "idx_tasks_project_id", columnList = "project_id")
})
public class Task {

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

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "actual_minutes")
    private Integer actualMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel = RiskLevel.LOW;

    @Column(name = "risk_reason", length = 500)
    private String riskReason;

    @Column(length = 120)
    private String track;

    @Column(length = 120)
    private String phase;

    @Column(name = "parent_task_id")
    private Long parentTaskId;

    @Column(name = "project_id")
    private Long projectId;

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

    @Column(name = "board_column_id")
    private Long boardColumnId;

    @Column(nullable = false)
    private int position;

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

    @Transient
    private List<Long> dependencyIds = new ArrayList<>();

    @Transient
    private List<Long> blockingTaskIds = new ArrayList<>();

    @Transient
    private List<Long> subtaskIds = new ArrayList<>();

    @Transient
    private int subtaskCount;

    @Transient
    private int completedSubtaskCount;

    public Task() {}
    public Task(@NotBlank String title) { this.title = title; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }
    public Integer getActualMinutes() { return actualMinutes; }
    public void setActualMinutes(Integer actualMinutes) { this.actualMinutes = actualMinutes; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }
    public String getRiskReason() { return riskReason; }
    public void setRiskReason(String riskReason) { this.riskReason = riskReason; }
    public String getTrack() { return track; }
    public void setTrack(String track) { this.track = track; }
    public String getPhase() { return phase; }
    public void setPhase(String phase) { this.phase = phase; }
    public Long getParentTaskId() { return parentTaskId; }
    public void setParentTaskId(Long parentTaskId) { this.parentTaskId = parentTaskId; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
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
    public Long getBoardColumnId() { return boardColumnId; }
    public void setBoardColumnId(Long boardColumnId) { this.boardColumnId = boardColumnId; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
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
    public List<Long> getDependencyIds() { return dependencyIds; }
    public void setDependencyIds(List<Long> dependencyIds) { this.dependencyIds = dependencyIds == null ? new ArrayList<>() : dependencyIds; }
    public List<Long> getBlockingTaskIds() { return blockingTaskIds; }
    public void setBlockingTaskIds(List<Long> blockingTaskIds) { this.blockingTaskIds = blockingTaskIds == null ? new ArrayList<>() : blockingTaskIds; }
    public List<Long> getSubtaskIds() { return subtaskIds; }
    public void setSubtaskIds(List<Long> subtaskIds) { this.subtaskIds = subtaskIds == null ? new ArrayList<>() : subtaskIds; }
    public int getSubtaskCount() { return subtaskCount; }
    public void setSubtaskCount(int subtaskCount) { this.subtaskCount = subtaskCount; }
    public int getCompletedSubtaskCount() { return completedSubtaskCount; }
    public void setCompletedSubtaskCount(int completedSubtaskCount) { this.completedSubtaskCount = completedSubtaskCount; }
    public int getSubtaskProgressPercent() { return subtaskCount == 0 ? 0 : (int) Math.round((completedSubtaskCount * 100.0) / subtaskCount); }
}
