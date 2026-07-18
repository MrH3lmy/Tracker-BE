package com.taskpriority.repository;

import com.taskpriority.model.NoteVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, Long> {
    List<NoteVersion> findByUserIdAndNoteIdOrderByCreatedAtDescIdDesc(Long userId, Long noteId);
    Optional<NoteVersion> findTopByUserIdAndNoteIdOrderByCreatedAtDescIdDesc(Long userId, Long noteId);
    Optional<NoteVersion> findByUserIdAndIdAndNoteId(Long userId, Long id, Long noteId);
}
