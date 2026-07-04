package com.taskpriority.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "note_task_links", indexes = {
        @Index(name = "idx_note_task_links_note_id", columnList = "note_id"),
        @Index(name = "idx_note_task_links_block_id", columnList = "note_block_id"),
        @Index(name = "idx_note_task_links_task_id", columnList = "task_id")
})
public class NoteTaskLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_block_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private NoteBlock noteBlock;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Task task;

    @Column(name = "selected_text", columnDefinition = "text")
    private String selectedText;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Note getNote() { return note; }
    public void setNote(Note note) { this.note = note; }
    public NoteBlock getNoteBlock() { return noteBlock; }
    public void setNoteBlock(NoteBlock noteBlock) { this.noteBlock = noteBlock; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public String getSelectedText() { return selectedText; }
    public void setSelectedText(String selectedText) { this.selectedText = selectedText; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
