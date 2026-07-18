package com.taskpriority.model;

import jakarta.persistence.*;

@Entity
@Table(name = "priority_scoring_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_priority_scoring_settings_user_setting", columnNames = {"user_id", "setting_name"}))
public class PriorityScoringSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "setting_name", nullable = false, length = 100)
    private String settingName;

    @Column(name = "setting_value", nullable = false)
    private Integer settingValue;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSettingName() {
        return settingName;
    }

    public void setSettingName(String settingName) {
        this.settingName = settingName;
    }

    public Integer getSettingValue() {
        return settingValue;
    }

    public void setSettingValue(Integer settingValue) {
        this.settingValue = settingValue;
    }
}
