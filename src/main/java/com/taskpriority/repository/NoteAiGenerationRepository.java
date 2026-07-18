package com.taskpriority.repository;

import com.taskpriority.model.NoteAiGeneration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteAiGenerationRepository extends JpaRepository<NoteAiGeneration, Long> {
    List<NoteAiGeneration> findByUserIdAndNoteIdOrderByCreatedAtDescIdDesc(Long userId, Long noteId);
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime after);
}
