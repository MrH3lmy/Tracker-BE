package com.taskpriority.repository;

import com.taskpriority.model.NoteTaskLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NoteTaskLinkRepository extends JpaRepository<NoteTaskLink, Long> {
    List<NoteTaskLink> findByUserIdAndNoteId(Long userId, Long noteId);
    List<NoteTaskLink> findByUserIdAndNoteIdIn(Long userId, Collection<Long> noteIds);
    List<NoteTaskLink> findByUserIdAndNoteBlockId(Long userId, Long noteBlockId);
    List<NoteTaskLink> findByUserIdAndNoteBlockIdIn(Long userId, Collection<Long> noteBlockIds);
    List<NoteTaskLink> findByUserIdAndTaskId(Long userId, Long taskId);
    boolean existsByUserIdAndNoteIdAndTaskIdAndNoteBlockId(Long userId, Long noteId, Long taskId, Long noteBlockId);
    boolean existsByUserIdAndNoteIdAndTaskIdAndNoteBlockIsNull(Long userId, Long noteId, Long taskId);

    /** Idempotency lookup for meeting-note action-item conversion (issue #287) - see V53's partial unique index. */
    Optional<NoteTaskLink> findByUserIdAndNoteIdAndNoteBlockIdAndLinkType(Long userId, Long noteId, Long noteBlockId, String linkType);
}
