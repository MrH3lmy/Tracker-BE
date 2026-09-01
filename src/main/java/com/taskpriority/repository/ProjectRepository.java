package com.taskpriority.repository;

import com.taskpriority.model.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserId(Long userId);
    Optional<Project> findByUserIdAndId(Long userId, Long id);
    boolean existsByUserIdAndId(Long userId, Long id);

    /**
     * Serializes dependency-graph mutations for one project. Dependency writes are deliberately
     * low-frequency, and using the owning project row as the transaction-scoped mutex keeps the
     * acyclic-graph invariant correct even when concurrent edges have disjoint task endpoints.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Project p where p.userId = :userId and p.id = :projectId")
    Optional<Project> findByUserIdAndIdForUpdate(@Param("userId") Long userId, @Param("projectId") Long projectId);
}
