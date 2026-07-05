package com.taskpriority.repository;

import com.taskpriority.model.NoteVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, Long> {
    List<NoteVersion> findByNoteIdOrderByCreatedAtDescIdDesc(Long noteId);
    Optional<NoteVersion> findTopByNoteIdOrderByCreatedAtDescIdDesc(Long noteId);
    Optional<NoteVersion> findByIdAndNoteId(Long id, Long noteId);
}
