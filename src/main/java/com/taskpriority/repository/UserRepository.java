package com.taskpriority.repository;

import com.taskpriority.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByEmailIgnoreCase(String email);

    /**
     * Serializes dependency-graph mutations for the user's project-less task graph. Project-scoped
     * task graphs use the owning project row instead, so unrelated projects remain independent.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :userId")
    Optional<User> findByIdForUpdate(@Param("userId") Long userId);

    // Used by scheduled jobs (ReminderService) that only need the id to iterate per-user work -
    // avoids loading every user's full row (email, password hash, etc.) on every tick.
    @Query("select u.id from User u")
    List<Long> findAllUserIds();
}
