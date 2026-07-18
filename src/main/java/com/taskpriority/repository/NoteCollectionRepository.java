package com.taskpriority.repository;

import com.taskpriority.model.NoteCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoteCollectionRepository extends JpaRepository<NoteCollection, Long> {
    List<NoteCollection> findByUserIdOrderByNameAscIdAsc(Long userId);
    Optional<NoteCollection> findByUserIdAndId(Long userId, Long id);
    boolean existsByUserIdAndId(Long userId, Long id);
}
