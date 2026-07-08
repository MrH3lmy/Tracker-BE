package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note> {

    List<Note> findByTaskIdOrderByDisplayOrderAscIdAsc(Long taskId);

    List<Note> findByTaskIsNullOrderByUpdatedAtDescIdDesc();

    List<Note> findByContentTypeOrderByUpdatedAtDescIdDesc(NoteContentType contentType);

    default List<Note> findAllMatching(Long taskId, String query, NoteContentType contentType) {
        return findAll(NoteSpecifications.matching(taskId, null, query, contentType, null, null,
                null, null, null, null, null, List.of(), null));
    }

    @Override
    @EntityGraph(attributePaths = {"tags", "collection"})
    Page<Note> findAll(Specification<Note> specification, Pageable pageable);
}
