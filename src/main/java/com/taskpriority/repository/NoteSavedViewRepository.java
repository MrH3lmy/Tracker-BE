package com.taskpriority.repository;

import com.taskpriority.model.NoteSavedView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteSavedViewRepository extends JpaRepository<NoteSavedView, Long> {
    List<NoteSavedView> findAllByOrderByNameAscIdAsc();
}
