package com.taskpriority.repository;

import com.taskpriority.model.NoteBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteBlockRepository extends JpaRepository<NoteBlock, Long> {
    List<NoteBlock> findByUserIdAndNoteIdOrderByPositionAscIdAsc(Long userId, Long noteId);
    Optional<NoteBlock> findByUserIdAndIdAndNoteId(Long userId, Long id, Long noteId);
}
