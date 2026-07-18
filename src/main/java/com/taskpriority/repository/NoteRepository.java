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
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note>, NoteRepositoryCustom {

    Optional<Note> findByUserIdAndId(Long userId, Long id);

    boolean existsByUserIdAndId(Long userId, Long id);

    List<Note> findByUserIdAndTaskIdOrderByDisplayOrderAscIdAsc(Long userId, Long taskId);

    List<Note> findByUserIdAndTaskIsNullOrderByUpdatedAtDescIdDesc(Long userId);

    List<Note> findByUserIdAndContentTypeOrderByUpdatedAtDescIdDesc(Long userId, NoteContentType contentType);

    @Query("select coalesce(max(n.displayOrder), 0) from Note n where n.userId = :userId")
    Integer findMaxDisplayOrder(@Param("userId") Long userId);

    default List<Note> findAllMatching(Long userId, Long taskId, String query, NoteContentType contentType) {
        List<Long> noteIds = findIds(NoteSpecifications.matching(userId, taskId, null, query, contentType, null, null,
                null, null, null, null, null, List.of(), null), Pageable.unpaged());
        if (noteIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Note> notesById = findAllWithAssociationsByUserIdAndIdIn(userId, noteIds).stream()
                .collect(Collectors.toMap(Note::getId, Function.identity()));
        return noteIds.stream()
                .map(notesById::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @EntityGraph(attributePaths = {"tags", "collection", "task"})
    List<Note> findAllWithAssociationsByUserIdAndIdIn(Long userId, Collection<Long> ids);

    @Override
    @EntityGraph(attributePaths = {"tags", "collection"})
    Page<Note> findAll(Specification<Note> specification, Pageable pageable);
}
