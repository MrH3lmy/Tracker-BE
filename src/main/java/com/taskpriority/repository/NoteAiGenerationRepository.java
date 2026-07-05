package com.taskpriority.repository;

import com.taskpriority.model.NoteAiGeneration;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteAiGenerationRepository extends JpaRepository<NoteAiGeneration, Long> {
    List<NoteAiGeneration> findByNoteIdOrderByCreatedAtDescIdDesc(Long noteId);
}
