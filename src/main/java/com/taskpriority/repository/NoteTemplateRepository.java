package com.taskpriority.repository;

import com.taskpriority.model.NoteTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, Long> {
    boolean existsByName(String name);
    List<NoteTemplate> findAllByOrderByCategoryAscNameAsc();
}
