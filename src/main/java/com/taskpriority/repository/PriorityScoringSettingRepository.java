package com.taskpriority.repository;

import com.taskpriority.model.PriorityScoringSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PriorityScoringSettingRepository extends JpaRepository<PriorityScoringSetting, Long> {
    Optional<PriorityScoringSetting> findByUserIdAndSettingName(Long userId, String settingName);
}
