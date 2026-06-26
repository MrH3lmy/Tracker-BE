package com.taskpriority.repository;

import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteAttachmentKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteAttachmentRepository extends JpaRepository<NoteAttachment, Long> {
    List<NoteAttachment> findByNoteIdAndKindOrderByCreatedAtAscIdAsc(Long noteId, NoteAttachmentKind kind);
    Optional<NoteAttachment> findByIdAndNoteIdAndKind(Long id, Long noteId, NoteAttachmentKind kind);
    long countByNoteId(Long noteId);
}
