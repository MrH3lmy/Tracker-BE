package com.taskpriority.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.AppSetting;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.repository.AppSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SettingsServiceTest {
    private static final Long USER_ID = 1L;

    private final Map<String, AppSetting> savedSettings = new LinkedHashMap<>();
    private AppSettingRepository appSettingRepository;
    private CurrentUserService currentUserService;
    private SettingsService settingsService;

    @BeforeEach
    void setUp() {
        savedSettings.clear();
        appSettingRepository = mock(AppSettingRepository.class);
        currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(USER_ID, "u@example.com", Tier.FREE, Role.USER));
        settingsService = new SettingsService(appSettingRepository, new ObjectMapper(), currentUserService);
        when(appSettingRepository.findByUserId(USER_ID)).thenAnswer(invocation -> List.copyOf(savedSettings.values()));
        when(appSettingRepository.save(any(AppSetting.class))).thenAnswer(invocation -> {
            AppSetting setting = invocation.getArgument(0);
            savedSettings.put(setting.getKey(), setting);
            return setting;
        });
    }

    @Test
    void getAllDefaultsHabitReminderStyleToStandard() {
        Map<String, Object> settings = settingsService.getAll();
        assertEquals("standard", settings.get(SettingsService.HABIT_REMINDER_STYLE_KEY));
    }

    @Test
    void updateAcceptsEachValidHabitReminderStyle() {
        for (String style : List.of("silent", "gentle", "standard", "persistent")) {
            Map<String, Object> updated = settingsService.update(Map.of(SettingsService.HABIT_REMINDER_STYLE_KEY, style));
            assertEquals(style, updated.get(SettingsService.HABIT_REMINDER_STYLE_KEY));
        }
    }

    @Test
    void updateRejectsUnknownHabitReminderStyle() {
        Map<String, Object> updates = Map.of(SettingsService.HABIT_REMINDER_STYLE_KEY, "loud");
        assertThrows(IllegalArgumentException.class, () -> settingsService.update(updates));
    }

    @Test
    void updateRejectsNonStringHabitReminderStyle() {
        Map<String, Object> updates = Map.of(SettingsService.HABIT_REMINDER_STYLE_KEY, 42);
        assertThrows(IllegalArgumentException.class, () -> settingsService.update(updates));
    }

    @Test
    void getAllReturnsSavedHabitReminderStyle() {
        AppSetting saved = new AppSetting();
        saved.setUserId(USER_ID);
        saved.setKey(SettingsService.HABIT_REMINDER_STYLE_KEY);
        saved.setValue("persistent");
        when(appSettingRepository.findByUserId(USER_ID)).thenReturn(List.of(saved));

        Map<String, Object> settings = settingsService.getAll();
        assertEquals("persistent", settings.get(SettingsService.HABIT_REMINDER_STYLE_KEY));
    }
}
