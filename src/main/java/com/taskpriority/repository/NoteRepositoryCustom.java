package com.taskpriority.repository;

import com.taskpriority.model.Note;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface NoteRepositoryCustom {
    List<Long> findIds(Specification<Note> specification, Pageable pageable);
}
