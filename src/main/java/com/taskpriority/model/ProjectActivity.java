package com.taskpriority.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

/**
 * One append-only row per meaningful project event (issue #288). This is a timeline, not event
 * sourcing: the tasks/notes/projects tables remain the source of truth for current state, and
 * historical rows here are never rewritten to match a later edit (see ProjectActivityService).
 */
@Entity
@Table(name = "project_activities", indexes = {
        @Index(name = "idx_project_activities_project_occurred_id", columnList = "project_id, occurred_at, id")
})
public class ProjectActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    // Who performed the action. Always equal to userId today (there's no shared-project/
    // delegated-ownership feature yet - see Project.ownerUserId for the same forward-looking
    // distinction already made elsewhere in this schema), kept separate so a future
    // multi-collaborator feature doesn't need a schema change here.
    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private ActivityEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 50)
    private ActivityEntityType entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @NotBlank
    @Column(nullable = false, length = 500)
    private String summary;

    // Small, hand-serialized JSON blob (e.g. {"fromStatus":"NOT_STARTED","toStatus":"DONE"}) -
    // plain TEXT, matching every other JSON-ish column in this codebase (note_versions.blocksJson,
    // note_ai_generations.auditMetadata, etc.); no jsonb/hstore is used anywhere in this schema.
    // Never a full entity snapshot.
    @Column(columnDefinition = "text")
    private String metadata;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public Long getActorUserId() { return actorUserId; }
    public void setActorUserId(Long actorUserId) { this.actorUserId = actorUserId; }
    public ActivityEventType getEventType() { return eventType; }
    public void setEventType(ActivityEventType eventType) { this.eventType = eventType; }
    public ActivityEntityType getEntityType() { return entityType; }
    public void setEntityType(ActivityEntityType entityType) { this.entityType = entityType; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
