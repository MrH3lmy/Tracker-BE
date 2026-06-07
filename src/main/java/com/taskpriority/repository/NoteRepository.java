package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByTaskIdOrderByUpdatedAtDescIdDesc(Long taskId);

    List<Note> findByTaskIsNullOrderByUpdatedAtDescIdDesc();

    List<Note> findByContentTypeOrderByUpdatedAtDescIdDesc(NoteContentType contentType);

    @Query("""
            select n from Note n
            where (:taskId is null or n.task.id = :taskId)
              and (:contentType is null or n.contentType = :contentType)
              and (:query is null
                   or lower(cast(n.title as string)) like lower(concat('%', cast(:query as string), '%'))
                   or lower(cast(coalesce(n.body, '') as string)) like lower(concat('%', cast(:query as string), '%')))
            order by n.updatedAt desc, n.id desc
            """)
    List<Note> findAllMatching(
            @Param("taskId") Long taskId,
            @Param("query") String query,
            @Param("contentType") NoteContentType contentType
    );
}
