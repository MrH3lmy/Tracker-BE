package com.taskpriority.repository;

import com.taskpriority.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByEmailIgnoreCase(String email);

    // Used by scheduled jobs (ReminderService) that only need the id to iterate per-user work -
    // avoids loading every user's full row (email, password hash, etc.) on every tick.
    @Query("select u.id from User u")
    List<Long> findAllUserIds();
}
