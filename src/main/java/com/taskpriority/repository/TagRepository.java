package com.taskpriority.repository;

import com.taskpriority.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUserIdAndNameIn(Long userId, Collection<String> names);
    List<Tag> findByUserId(Long userId);
    List<Tag> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);
}
