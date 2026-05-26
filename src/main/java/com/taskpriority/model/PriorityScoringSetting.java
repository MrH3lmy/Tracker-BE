package com.taskpriority.model;

import jakarta.persistence.*;

@Entity
@Table(name = "priority_scoring_settings")
public class PriorityScoringSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_name", nullable = false, unique = true, length = 100)
    private String settingName;

    @Column(name = "setting_value", nullable = false)
    private Integer settingValue;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
