package com.taskpriority.repository;

import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {
    Optional<BoardColumn> findFirstByStatusOrderByPositionAsc(Status status);
    List<BoardColumn> findAllByOrderByPositionAsc();
}
