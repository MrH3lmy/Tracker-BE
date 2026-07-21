package com.taskpriority.repository;

import com.taskpriority.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserId(Long userId);
    Optional<Project> findByUserIdAndId(Long userId, Long id);
    boolean existsByUserIdAndId(Long userId, Long id);
}
