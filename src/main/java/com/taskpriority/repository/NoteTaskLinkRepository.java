package com.taskpriority.repository;

import com.taskpriority.model.NoteTaskLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NoteTaskLinkRepository extends JpaRepository<NoteTaskLink, Long> {
    List<NoteTaskLink> findByNoteId(Long noteId);
    List<NoteTaskLink> findByNoteIdIn(Collection<Long> noteIds);
    List<NoteTaskLink> findByNoteBlockId(Long noteBlockId);
    List<NoteTaskLink> findByNoteBlockIdIn(Collection<Long> noteBlockIds);
    List<NoteTaskLink> findByTaskId(Long taskId);
    boolean existsByNoteIdAndTaskIdAndNoteBlockId(Long noteId, Long taskId, Long noteBlockId);
    boolean existsByNoteIdAndTaskIdAndNoteBlockIsNull(Long noteId, Long taskId);
}

