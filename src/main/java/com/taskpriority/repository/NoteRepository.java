package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByTaskIdOrderByDisplayOrderAscIdAsc(Long taskId);

    List<Note> findByTaskIsNullOrderByUpdatedAtDescIdDesc();

    List<Note> findByContentTypeOrderByUpdatedAtDescIdDesc(NoteContentType contentType);

    default List<Note> findAllMatching(Long taskId, String query, NoteContentType contentType) {
        return findAllMatching(taskId, null, query, contentType, false, List.of(), Pageable.unpaged()).getContent();
    }

    @EntityGraph(attributePaths = {"tags", "collection"})
    @Query("""
            select distinct n from Note n
            where (:taskId is null or n.task.id = :taskId)
              and (:collectionId is null or n.collection.id = :collectionId)
              and (:contentType is null or n.contentType = :contentType)
              and (:query is null
                   or lower(cast(n.title as string)) like lower(concat('%', cast(:query as string), '%'))
                   or lower(cast(coalesce(n.body, '') as string)) like lower(concat('%', cast(:query as string), '%')))
              and (:hasTags = false or exists (
                   select tagFilter from n.tags tagFilter
                   where tagFilter.name in :tagNames
              ))
            """)
    Page<Note> findAllMatching(
            @Param("taskId") Long taskId,
            @Param("collectionId") Long collectionId,
            @Param("query") String query,
            @Param("contentType") NoteContentType contentType,
            @Param("hasTags") boolean hasTags,
            @Param("tagNames") List<String> tagNames,
            Pageable pageable
    );
}
