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
        return findAllMatching(taskId, query, contentType, false, List.of(), Pageable.unpaged()).getContent();
    }

    default Page<Note> findAllMatching(Long taskId, String query, NoteContentType contentType, boolean hasTags, List<String> tagNames, Pageable pageable) {
        if (taskId == null) {
            return findAllMatchingGlobally(query, contentType, hasTags, tagNames, pageable);
        }
        return findAllMatchingForTask(taskId, query, contentType, hasTags, tagNames, pageable);
    }

    @EntityGraph(attributePaths = "tags")
    @Query("""
            select distinct n from Note n
            where n.task.id = :taskId
              and (:contentType is null or n.contentType = :contentType)
              and (:query is null
                   or lower(cast(n.title as string)) like lower(concat('%', cast(:query as string), '%'))
                   or lower(cast(coalesce(n.body, '') as string)) like lower(concat('%', cast(:query as string), '%')))
              and (:hasTags = false or exists (
                   select tagFilter from n.tags tagFilter
                   where tagFilter.name in :tagNames
              ))
            """)
    Page<Note> findAllMatchingForTask(
            @Param("taskId") Long taskId,
            @Param("query") String query,
            @Param("contentType") NoteContentType contentType,
            @Param("hasTags") boolean hasTags,
            @Param("tagNames") List<String> tagNames,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "tags")
    @Query("""
            select distinct n from Note n
            where (:contentType is null or n.contentType = :contentType)
              and (:query is null
                   or lower(cast(n.title as string)) like lower(concat('%', cast(:query as string), '%'))
                   or lower(cast(coalesce(n.body, '') as string)) like lower(concat('%', cast(:query as string), '%')))
              and (:hasTags = false or exists (
                   select tagFilter from n.tags tagFilter
                   where tagFilter.name in :tagNames
              ))
            """)
    Page<Note> findAllMatchingGlobally(
            @Param("query") String query,
            @Param("contentType") NoteContentType contentType,
            @Param("hasTags") boolean hasTags,
            @Param("tagNames") List<String> tagNames,
            Pageable pageable
    );
}
