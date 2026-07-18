package com.taskpriority.repository;

import com.taskpriority.model.NoteTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, Long> {
    boolean existsByUserIdAndName(Long userId, String name);
    List<NoteTemplate> findByUserIdOrderByCategoryAscNameAsc(Long userId);
    Optional<NoteTemplate> findByUserIdAndId(Long userId, Long id);
}
