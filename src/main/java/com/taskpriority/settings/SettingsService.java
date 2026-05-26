package com.taskpriority.settings;

import com.taskpriority.model.AppSetting;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SettingsService {
    private final Map<String, String> store = new ConcurrentHashMap<>();

    public Map<String, String> getAll() { return store; }

    public Map<String, String> update(Map<String, String> updates) {
        store.putAll(updates);
        return store;
    }
}
