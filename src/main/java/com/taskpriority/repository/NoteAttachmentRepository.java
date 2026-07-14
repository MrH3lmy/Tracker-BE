package com.taskpriority.repository;

import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteAttachmentKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NoteAttachmentRepository extends JpaRepository<NoteAttachment, Long> {
    List<NoteAttachment> findByNoteIdAndKindOrderByCreatedAtAscIdAsc(Long noteId, NoteAttachmentKind kind);
    List<NoteAttachment> findByNoteIdInAndKindOrderByCreatedAtAscIdAsc(Collection<Long> noteIds, NoteAttachmentKind kind);
    Optional<NoteAttachment> findByIdAndNoteIdAndKind(Long id, Long noteId, NoteAttachmentKind kind);

    @Query("""
            select a from NoteAttachment a
            join a.note n
            where n.task.id = :taskId
              and a.kind = :kind
            order by n.displayOrder asc, n.id asc, a.createdAt asc, a.id asc
            """)
    List<NoteAttachment> findTaskAttachmentsByKindInNavigationOrder(@Param("taskId") Long taskId, @Param("kind") NoteAttachmentKind kind);
    long countByNoteId(Long noteId);
}
