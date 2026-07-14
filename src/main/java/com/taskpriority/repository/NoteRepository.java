package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note>, NoteRepositoryCustom {

    List<Note> findByTaskIdOrderByDisplayOrderAscIdAsc(Long taskId);

    List<Note> findByTaskIsNullOrderByUpdatedAtDescIdDesc();

    List<Note> findByContentTypeOrderByUpdatedAtDescIdDesc(NoteContentType contentType);

    @Query("select coalesce(max(n.displayOrder), 0) from Note n")
    Integer findMaxDisplayOrder();

    default List<Note> findAllMatching(Long taskId, String query, NoteContentType contentType) {
        List<Long> noteIds = findIds(NoteSpecifications.matching(taskId, null, query, contentType, null, null,
                null, null, null, null, null, List.of(), null), Pageable.unpaged());
        if (noteIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Note> notesById = findAllWithAssociationsByIdIn(noteIds).stream()
                .collect(Collectors.toMap(Note::getId, Function.identity()));
        return noteIds.stream()
                .map(notesById::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @EntityGraph(attributePaths = {"tags", "collection", "task"})
    List<Note> findAllWithAssociationsByIdIn(Collection<Long> ids);

    @Override
    @EntityGraph(attributePaths = {"tags", "collection"})
    Page<Note> findAll(Specification<Note> specification, Pageable pageable);
}
