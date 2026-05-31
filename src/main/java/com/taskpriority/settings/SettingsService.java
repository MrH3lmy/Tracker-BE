package com.taskpriority.settings;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.AppSetting;
import com.taskpriority.repository.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SettingsService {
    public static final String EXCLUDED_WEEKDAYS_KEY = "excludedWeekdays";
    public static final String HOLIDAY_DATES_KEY = "holidayDates";
    public static final String DEFAULT_DAILY_CAPACITY_HOURS_KEY = "defaultDailyCapacityHours";
    public static final List<DayOfWeek> DEFAULT_EXCLUDED_WEEKDAYS = List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
    public static final double DEFAULT_DAILY_CAPACITY_HOURS = 6.0;

    private static final Set<String> KNOWN_CALENDAR_KEYS = Set.of(
            EXCLUDED_WEEKDAYS_KEY,
            HOLIDAY_DATES_KEY,
            DEFAULT_DAILY_CAPACITY_HOURS_KEY
    );

    private final AppSettingRepository appSettingRepository;
    private final ObjectMapper objectMapper;

    public SettingsService(AppSettingRepository appSettingRepository, ObjectMapper objectMapper) {
        this.appSettingRepository = appSettingRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAll() {
        Map<String, Object> settings = defaultSettings();
        appSettingRepository.findAll().stream()
                .sorted(Comparator.comparing(AppSetting::getKey))
                .forEach(setting -> settings.put(setting.getKey(), parseSettingValue(setting.getKey(), setting.getValue())));
        normalizeCalendarSettings(settings);
        return settings;
    }

    @Transactional
    public Map<String, Object> update(Map<String, Object> updates) {
        if (updates == null) throw new IllegalArgumentException("Settings payload must be an object.");
        for (Map.Entry<String, Object> entry : updates.entrySet()) {
            validateSetting(entry.getKey(), entry.getValue());
            AppSetting setting = appSettingRepository.findById(entry.getKey()).orElseGet(AppSetting::new);
            setting.setKey(entry.getKey());
            setting.setValue(serializeSettingValue(entry.getValue()));
            appSettingRepository.save(setting);
        }
        return getAll();
    }

    @Transactional(readOnly = true)
    public List<DayOfWeek> getExcludedWeekdays() {
        return parseWeekdays(getAll().get(EXCLUDED_WEEKDAYS_KEY), EXCLUDED_WEEKDAYS_KEY);
    }

    @Transactional(readOnly = true)
    public List<LocalDate> getHolidayDates() {
        return parseDates(getAll().get(HOLIDAY_DATES_KEY), HOLIDAY_DATES_KEY);
    }

    @Transactional(readOnly = true)
    public double getDefaultDailyCapacityHours() {
        return parseCapacityHours(getAll().get(DEFAULT_DAILY_CAPACITY_HOURS_KEY), DEFAULT_DAILY_CAPACITY_HOURS_KEY);
    }

    private Map<String, Object> defaultSettings() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put(EXCLUDED_WEEKDAYS_KEY, DEFAULT_EXCLUDED_WEEKDAYS.stream().map(DayOfWeek::name).toList());
        defaults.put(HOLIDAY_DATES_KEY, List.of());
        defaults.put(DEFAULT_DAILY_CAPACITY_HOURS_KEY, DEFAULT_DAILY_CAPACITY_HOURS);
        return defaults;
    }

    private void normalizeCalendarSettings(Map<String, Object> settings) {
        settings.put(EXCLUDED_WEEKDAYS_KEY, parseWeekdays(settings.get(EXCLUDED_WEEKDAYS_KEY), EXCLUDED_WEEKDAYS_KEY).stream().map(DayOfWeek::name).toList());
        settings.put(HOLIDAY_DATES_KEY, parseDates(settings.get(HOLIDAY_DATES_KEY), HOLIDAY_DATES_KEY).stream().map(LocalDate::toString).toList());
        settings.put(DEFAULT_DAILY_CAPACITY_HOURS_KEY, parseCapacityHours(settings.get(DEFAULT_DAILY_CAPACITY_HOURS_KEY), DEFAULT_DAILY_CAPACITY_HOURS_KEY));
    }

    private Object parseSettingValue(String key, String value) {
        if (!KNOWN_CALENDAR_KEYS.contains(key)) {
            return parseUnknownSetting(value);
        }
        try {
            if (EXCLUDED_WEEKDAYS_KEY.equals(key) || HOLIDAY_DATES_KEY.equals(key)) {
                return objectMapper.readValue(value, new TypeReference<List<String>>() {});
            }
            if (DEFAULT_DAILY_CAPACITY_HOURS_KEY.equals(key)) {
                return objectMapper.readValue(value, Double.class);
            }
        } catch (JsonProcessingException | IllegalArgumentException ignored) {
            return value;
        }
        return value;
    }

    private Object parseUnknownSetting(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("\"") || "true".equals(trimmed) || "false".equals(trimmed) || "null".equals(trimmed)) {
            try {
                return objectMapper.readValue(trimmed, Object.class);
            } catch (JsonProcessingException ignored) {
                return value;
            }
        }
        return value;
    }

    private void validateSetting(String key, Object value) {
        if (key == null || key.isBlank()) throw new IllegalArgumentException("Settings keys must be non-empty strings.");
        switch (key) {
            case EXCLUDED_WEEKDAYS_KEY -> parseWeekdays(value, key);
            case HOLIDAY_DATES_KEY -> parseDates(value, key);
            case DEFAULT_DAILY_CAPACITY_HOURS_KEY -> parseCapacityHours(value, key);
            default -> { }
        }
    }

    private List<DayOfWeek> parseWeekdays(Object value, String key) {
        if (!(value instanceof List<?> values)) throw new IllegalArgumentException(key + " must be an array of weekday names.");
        List<DayOfWeek> weekdays = new ArrayList<>();
        for (Object item : values) {
            if (!(item instanceof String text) || text.isBlank()) throw new IllegalArgumentException(key + " must contain weekday names.");
            try {
                DayOfWeek weekday = DayOfWeek.valueOf(text.trim().toUpperCase());
                if (!weekdays.contains(weekday)) weekdays.add(weekday);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(key + " contains invalid weekday: " + text + ". Use MONDAY through SUNDAY.");
            }
        }
        return weekdays;
    }

    private List<LocalDate> parseDates(Object value, String key) {
        if (!(value instanceof List<?> values)) throw new IllegalArgumentException(key + " must be an array of ISO dates.");
        List<LocalDate> dates = new ArrayList<>();
        for (Object item : values) {
            if (!(item instanceof String text) || text.isBlank()) throw new IllegalArgumentException(key + " must contain ISO date strings.");
            try {
                LocalDate date = LocalDate.parse(text.trim());
                if (!dates.contains(date)) dates.add(date);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(key + " contains invalid ISO date: " + text + ". Use YYYY-MM-DD.");
            }
        }
        return dates.stream().sorted().toList();
    }

    private double parseCapacityHours(Object value, String key) {
        double capacity;
        if (value instanceof Number number) {
            capacity = number.doubleValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                capacity = Double.parseDouble(text.trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(key + " must be a number of hours.");
            }
        } else {
            throw new IllegalArgumentException(key + " must be a number of hours.");
        }
        if (!Double.isFinite(capacity) || capacity <= 0 || capacity > 24) {
            throw new IllegalArgumentException(key + " must be greater than 0 and no more than 24.");
        }
        return Math.round(capacity * 10.0) / 10.0;
    }

    private String serializeSettingValue(Object value) {
        if (value instanceof String text) return text;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Setting value could not be serialized.");
        }
    }
}
