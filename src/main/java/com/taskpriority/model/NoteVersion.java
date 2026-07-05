package com.taskpriority.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "note_versions", indexes = {
        @Index(name = "idx_note_versions_note_created", columnList = "note_id, created_at, id")
})
public class NoteVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Note note;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String body;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 40)
    private NoteContentType contentType;

    @Column(name = "blocks_json", columnDefinition = "text")
    private String blocksJson;

    @Column(columnDefinition = "text")
    private String tags;

    @Column(name = "editor_metadata", columnDefinition = "text")
    private String editorMetadata;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public NoteContentType getContentType() { return contentType; }
    public void setContentType(NoteContentType contentType) { this.contentType = contentType; }
    public String getBlocksJson() { return blocksJson; }
    public void setBlocksJson(String blocksJson) { this.blocksJson = blocksJson; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getEditorMetadata() { return editorMetadata; }
    public void setEditorMetadata(String editorMetadata) { this.editorMetadata = editorMetadata; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
