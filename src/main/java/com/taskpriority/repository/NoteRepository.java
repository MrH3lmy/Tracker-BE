package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByTaskIdOrderByDisplayOrderAscIdAsc(Long taskId);

    List<Note> findByTaskIsNullOrderByUpdatedAtDescIdDesc();

    List<Note> findByContentTypeOrderByUpdatedAtDescIdDesc(NoteContentType contentType);

    default List<Note> findAllMatching(Long taskId, String query, NoteContentType contentType) {
        return findAllMatching(taskId, null, query, contentType, null, null, null, null, null, null, null, false, List.<String>of(), 0L, Pageable.unpaged()).getContent();
    }

    @EntityGraph(attributePaths = {"tags", "collection"})
    @Query("""
            select distinct n from Note n
            where (:taskId is null or n.task.id = :taskId)
              and (:collectionId is null or n.collection.id = :collectionId)
              and (:contentType is null or n.contentType = :contentType)
              and (:hasAttachments is null or (:hasAttachments = true and exists (select a from NoteAttachment a where a.note = n)) or (:hasAttachments = false and not exists (select a from NoteAttachment a where a.note = n)))
              and (:linkedTask is null or (:linkedTask = true and (n.task is not null or exists (select l from NoteTaskLink l where l.note = n))) or (:linkedTask = false and n.task is null and not exists (select l from NoteTaskLink l where l.note = n)))
              and (:createdFrom is null or n.createdAt >= :createdFrom)
              and (:createdTo is null or n.createdAt <= :createdTo)
              and (:updatedFrom is null or n.updatedAt >= :updatedFrom)
              and (:updatedTo is null or n.updatedAt <= :updatedTo)
              and (:untagged is null or (:untagged = true and n.tags is empty) or (:untagged = false and n.tags is not empty))
              and (:query is null
                   or lower(cast(n.title as string)) like lower(concat('%', cast(:query as string), '%'))
                   or lower(cast(coalesce(n.body, '') as string)) like lower(concat('%', cast(:query as string), '%')))
              and (:hasTags = false or exists (
                   select tagFilter from n.tags tagFilter
                   where tagFilter.name in :tagNames
              ))
              and (:tagCount = 0 or (select count(distinct allTag.name) from n.tags allTag where allTag.name in :tagNames) = :tagCount)
            """)
    Page<Note> findAllMatching(
            @Param("taskId") Long taskId,
            @Param("collectionId") Long collectionId,
            @Param("query") String query,
            @Param("contentType") NoteContentType contentType,
            @Param("hasAttachments") Boolean hasAttachments,
            @Param("linkedTask") Boolean linkedTask,
            @Param("createdFrom") LocalDateTime createdFrom,
            @Param("createdTo") LocalDateTime createdTo,
            @Param("updatedFrom") LocalDateTime updatedFrom,
            @Param("updatedTo") LocalDateTime updatedTo,
            @Param("untagged") Boolean untagged,
            @Param("hasTags") boolean hasTags,
            @Param("tagNames") List<String> tagNames,
            @Param("tagCount") Long tagCount,
            Pageable pageable
    );
}
