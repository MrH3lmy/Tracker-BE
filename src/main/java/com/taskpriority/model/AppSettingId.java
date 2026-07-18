package com.taskpriority.model;

import java.io.Serializable;
import java.util.Objects;

public class AppSettingId implements Serializable {
    private Long userId;
    private String key;

    public AppSettingId() {}

    public AppSettingId(Long userId, String key) {
        this.userId = userId;
        this.key = key;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AppSettingId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(key, that.key);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, key);
    }
}
