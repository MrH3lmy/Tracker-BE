package com.taskpriority.repository;

import com.taskpriority.model.AppSetting;
import com.taskpriority.model.AppSettingId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppSettingRepository extends JpaRepository<AppSetting, AppSettingId> {
    List<AppSetting> findByUserId(Long userId);
}
