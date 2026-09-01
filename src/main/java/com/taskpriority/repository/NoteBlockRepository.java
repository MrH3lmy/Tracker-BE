package com.taskpriority.repository;

import com.taskpriority.model.NoteBlock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NoteBlockRepository extends JpaRepository<NoteBlock, Long> {
    List<NoteBlock> findByUserIdAndNoteIdOrderByPositionAscIdAsc(Long userId, Long noteId);
    Optional<NoteBlock> findByUserIdAndIdAndNoteId(Long userId, Long id, Long noteId);

    /**
     * Same lookup as {@link #findByUserIdAndIdAndNoteId}, but takes a {@code SELECT ... FOR UPDATE}
     * row lock on the block - used to serialize concurrent meeting-action conversions of the same
     * block onto a single DB connection/transaction (see {@code NoteTaskConversionService}) instead
     * of relying on a second, independently-pooled transaction to catch a lost race.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from NoteBlock b where b.userId = :userId and b.id = :id and b.note.id = :noteId")
    Optional<NoteBlock> findByUserIdAndIdAndNoteIdForUpdate(@Param("userId") Long userId, @Param("id") Long id, @Param("noteId") Long noteId);
}
