package com.taskpriority.repository;

import com.taskpriority.model.NoteCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteCollectionRepository extends JpaRepository<NoteCollection, Long> {
    List<NoteCollection> findAllByOrderByNameAscIdAsc();
}
