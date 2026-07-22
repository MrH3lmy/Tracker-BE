package com.taskpriority.repository;

import com.taskpriority.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, Long> {
    boolean existsByUserId(Long userId);
}
