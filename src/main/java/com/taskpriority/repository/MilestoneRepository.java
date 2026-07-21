package com.taskpriority.repository;

import com.taskpriority.model.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findByUserIdAndProjectIdOrderByTargetDateAscIdAsc(Long userId, Long projectId);
    Optional<Milestone> findByUserIdAndId(Long userId, Long id);
    void deleteByUserIdAndId(Long userId, Long id);
    long countByUserIdAndProjectId(Long userId, Long projectId);
}
