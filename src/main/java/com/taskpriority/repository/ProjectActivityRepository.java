package com.taskpriority.repository;

import com.taskpriority.model.ProjectActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, Long> {
    /** Sort order (occurredAt desc, id desc) is applied by the caller's Pageable - see ProjectActivityService. */
    Page<ProjectActivity> findByUserIdAndProjectId(Long userId, Long projectId, Pageable pageable);
}
