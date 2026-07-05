package com.taskpriority.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "note_ai_generations", indexes = {
        @Index(name = "idx_note_ai_generations_note_id", columnList = "note_id"),
        @Index(name = "idx_note_ai_generations_action", columnList = "action"),
        @Index(name = "idx_note_ai_generations_created_at", columnList = "created_at")
})
public class NoteAiGeneration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "note_id", nullable = false)
    private Note note;
    @Enumerated(EnumType.STRING) @Column(name = "action", nullable = false, length = 40)
    private NoteAiAction action;
    @Column(name = "provider", nullable = false, length = 80)
    private String provider;
    @Column(name = "model", length = 120)
    private String model;
    @Column(name = "generated_content", nullable = false, columnDefinition = "text")
    private String generatedContent;
    @Column(name = "source_hash", nullable = false, length = 64)
    private String sourceHash;
    @Column(name = "generated", nullable = false)
    private boolean generated = true;
    @Column(name = "applied", nullable = false)
    private boolean applied = false;
    @Column(name = "audit_metadata", nullable = false, columnDefinition = "text")
    private String auditMetadata;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist public void onCreate(){ if (createdAt == null) createdAt = LocalDateTime.now(); }
    public Long getId(){return id;} public void setId(Long id){this.id=id;}
    public Note getNote(){return note;} public void setNote(Note note){this.note=note;}
    public NoteAiAction getAction(){return action;} public void setAction(NoteAiAction action){this.action=action;}
    public String getProvider(){return provider;} public void setProvider(String provider){this.provider=provider;}
    public String getModel(){return model;} public void setModel(String model){this.model=model;}
    public String getGeneratedContent(){return generatedContent;} public void setGeneratedContent(String generatedContent){this.generatedContent=generatedContent;}
    public String getSourceHash(){return sourceHash;} public void setSourceHash(String sourceHash){this.sourceHash=sourceHash;}
    public boolean isGenerated(){return generated;} public void setGenerated(boolean generated){this.generated=generated;}
    public boolean isApplied(){return applied;} public void setApplied(boolean applied){this.applied=applied;}
    public String getAuditMetadata(){return auditMetadata;} public void setAuditMetadata(String auditMetadata){this.auditMetadata=auditMetadata;}
    public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime createdAt){this.createdAt=createdAt;}
}
