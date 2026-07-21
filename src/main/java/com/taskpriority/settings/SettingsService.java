package com.taskpriority.settings;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.AppSetting;
import com.taskpriority.model.AppSettingId;
import com.taskpriority.repository.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class SettingsService {
    public static final String EXCLUDED_WEEKDAYS_KEY = "excludedWeekdays";
    public static final String HOLIDAY_DATES_KEY = "holidayDates";
    public static final String DEFAULT_DAILY_CAPACITY_HOURS_KEY = "defaultDailyCapacityHours";
    public static final String AI_FEATURES_ENABLED_KEY = "aiFeaturesEnabled";
    public static final String WORKING_HOURS_KEY = "workingHours";
    public static final String SLEEP_HOURS_KEY = "sleepHours";
    public static final String HABIT_REMINDER_STYLE_KEY = "habitReminders.style";
    public static final String TIMEZONE_KEY = "timezone";
    public static final String QUIET_HOURS_KEY = "quietHours";
    public static final List<DayOfWeek> DEFAULT_EXCLUDED_WEEKDAYS = List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
    public static final double DEFAULT_DAILY_CAPACITY_HOURS = 6.0;
    public static final String DEFAULT_HABIT_REMINDER_STYLE = "standard";
    public static final String DEFAULT_TIMEZONE = "UTC";
    private static final Set<String> HABIT_REMINDER_STYLES = Set.of("silent", "gentle", "standard", "persistent");
    private static final List<DayOfWeek> DEFAULT_WORKING_DAYS = List.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);

    private static final Set<String> KNOWN_CALENDAR_KEYS = Set.of(
            EXCLUDED_WEEKDAYS_KEY,
            HOLIDAY_DATES_KEY,
            DEFAULT_DAILY_CAPACITY_HOURS_KEY,
            AI_FEATURES_ENABLED_KEY,
            WORKING_HOURS_KEY,
            SLEEP_HOURS_KEY,
            HABIT_REMINDER_STYLE_KEY,
            TIMEZONE_KEY,
            QUIET_HOURS_KEY
    );

    private final AppSettingRepository appSettingRepository;
    private final ObjectMapper objectMapper;
    private final CurrentUserService currentUserService;

    public SettingsService(AppSettingRepository appSettingRepository, ObjectMapper objectMapper, CurrentUserService currentUserService) {
        this.appSettingRepository = appSettingRepository;
        this.objectMapper = objectMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAll() {
        return getAllForUser(currentUserService.requireUserId());
    }

    /**
     * Same as {@link #getAll()} but for an explicit user rather than the request's authenticated
     * user -- used by the reminder producer job, which iterates every user outside any request/
     * security context.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAllForUser(Long userId) {
        Map<String, Object> settings = defaultSettings();
        appSettingRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(AppSetting::getKey))
                .forEach(setting -> settings.put(setting.getKey(), parseSettingValue(setting.getKey(), setting.getValue())));
        normalizeCalendarSettings(settings);
        return settings;
    }

    @Transactional
    public Map<String, Object> update(Map<String, Object> updates) {
        if (updates == null) throw new IllegalArgumentException("Settings payload must be an object.");
        Long userId = currentUserService.requireUserId();
        for (Map.Entry<String, Object> entry : updates.entrySet()) {
            validateSetting(entry.getKey(), entry.getValue());
            AppSetting setting = appSettingRepository.findById(new AppSettingId(userId, entry.getKey())).orElseGet(AppSetting::new);
            setting.setUserId(userId);
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

    @Transactional(readOnly = true)
    public Map<DayOfWeek, TimeWindow> getWorkingHours() {
        return parseTimeWindowMap(getAll().get(WORKING_HOURS_KEY), WORKING_HOURS_KEY);
    }

    @Transactional(readOnly = true)
    public Map<DayOfWeek, TimeWindow> getSleepHours() {
        return parseTimeWindowMap(getAll().get(SLEEP_HOURS_KEY), SLEEP_HOURS_KEY);
    }

    @Transactional(readOnly = true)
    public ZoneId getTimezone() {
        return parseTimezone(getAll().get(TIMEZONE_KEY));
    }

    @Transactional(readOnly = true)
    public Optional<TimeWindow> getQuietHours() {
        return Optional.ofNullable(parseQuietHours(getAll().get(QUIET_HOURS_KEY)));
    }

    @Transactional(readOnly = true)
    public ZoneId getTimezoneForUser(Long userId) {
        return parseTimezone(getAllForUser(userId).get(TIMEZONE_KEY));
    }

    @Transactional(readOnly = true)
    public Optional<TimeWindow> getQuietHoursForUser(Long userId) {
        return Optional.ofNullable(parseQuietHours(getAllForUser(userId).get(QUIET_HOURS_KEY)));
    }

    private Map<String, Object> defaultSettings() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put(EXCLUDED_WEEKDAYS_KEY, DEFAULT_EXCLUDED_WEEKDAYS.stream().map(DayOfWeek::name).toList());
        defaults.put(HOLIDAY_DATES_KEY, List.of());
        defaults.put(DEFAULT_DAILY_CAPACITY_HOURS_KEY, DEFAULT_DAILY_CAPACITY_HOURS);
        defaults.put(AI_FEATURES_ENABLED_KEY, false);
        defaults.put(WORKING_HOURS_KEY, serializeTimeWindowMap(defaultWorkingHours()));
        defaults.put(SLEEP_HOURS_KEY, serializeTimeWindowMap(defaultSleepHours()));
        defaults.put(HABIT_REMINDER_STYLE_KEY, DEFAULT_HABIT_REMINDER_STYLE);
        defaults.put(TIMEZONE_KEY, DEFAULT_TIMEZONE);
        defaults.put(QUIET_HOURS_KEY, null);
        return defaults;
    }

    private Map<DayOfWeek, TimeWindow> defaultWorkingHours() {
        Map<DayOfWeek, TimeWindow> defaults = new EnumMap<>(DayOfWeek.class);
        TimeWindow nineToFive = new TimeWindow(LocalTime.of(9, 0), LocalTime.of(17, 0));
        for (DayOfWeek day : DEFAULT_WORKING_DAYS) {
            defaults.put(day, nineToFive);
        }
        return defaults;
    }

    private Map<DayOfWeek, TimeWindow> defaultSleepHours() {
        Map<DayOfWeek, TimeWindow> defaults = new EnumMap<>(DayOfWeek.class);
        TimeWindow elevenToSeven = new TimeWindow(LocalTime.of(23, 0), LocalTime.of(7, 0));
        for (DayOfWeek day : DayOfWeek.values()) {
            defaults.put(day, elevenToSeven);
        }
        return defaults;
    }

    private void normalizeCalendarSettings(Map<String, Object> settings) {
        settings.put(EXCLUDED_WEEKDAYS_KEY, parseWeekdays(settings.get(EXCLUDED_WEEKDAYS_KEY), EXCLUDED_WEEKDAYS_KEY).stream().map(DayOfWeek::name).toList());
        settings.put(HOLIDAY_DATES_KEY, parseDates(settings.get(HOLIDAY_DATES_KEY), HOLIDAY_DATES_KEY).stream().map(LocalDate::toString).toList());
        settings.put(DEFAULT_DAILY_CAPACITY_HOURS_KEY, parseCapacityHours(settings.get(DEFAULT_DAILY_CAPACITY_HOURS_KEY), DEFAULT_DAILY_CAPACITY_HOURS_KEY));
        settings.put(AI_FEATURES_ENABLED_KEY, parseBoolean(settings.get(AI_FEATURES_ENABLED_KEY), AI_FEATURES_ENABLED_KEY));
        settings.put(WORKING_HOURS_KEY, serializeTimeWindowMap(parseTimeWindowMap(settings.get(WORKING_HOURS_KEY), WORKING_HOURS_KEY)));
        settings.put(SLEEP_HOURS_KEY, serializeTimeWindowMap(parseTimeWindowMap(settings.get(SLEEP_HOURS_KEY), SLEEP_HOURS_KEY)));
        settings.put(HABIT_REMINDER_STYLE_KEY, parseHabitReminderStyle(settings.get(HABIT_REMINDER_STYLE_KEY), HABIT_REMINDER_STYLE_KEY));
        settings.put(TIMEZONE_KEY, parseTimezone(settings.get(TIMEZONE_KEY)).getId());
        TimeWindow quietHours = parseQuietHours(settings.get(QUIET_HOURS_KEY));
        settings.put(QUIET_HOURS_KEY, quietHours == null ? null : Map.of("start", quietHours.start().toString(), "end", quietHours.end().toString()));
    }

    private ZoneId parseTimezone(Object value) {
        if (value == null) return ZoneId.of(DEFAULT_TIMEZONE);
        if (!(value instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException(TIMEZONE_KEY + " must be a valid IANA timezone name.");
        }
        try {
            return ZoneId.of(text.trim());
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException(TIMEZONE_KEY + " must be a valid IANA timezone name.");
        }
    }

    private TimeWindow parseQuietHours(Object value) {
        if (value == null) return null;
        if (!(value instanceof Map<?, ?> windowMap)) {
            throw new IllegalArgumentException(QUIET_HOURS_KEY + " must be an object with start/end, or null to disable.");
        }
        Object startRaw = windowMap.get("start");
        Object endRaw = windowMap.get("end");
        if (!(startRaw instanceof String startText) || !(endRaw instanceof String endText)) {
            throw new IllegalArgumentException(QUIET_HOURS_KEY + " must have start and end HH:mm strings.");
        }
        return new TimeWindow(parseTimeOfDay(startText, QUIET_HOURS_KEY, "start"), parseTimeOfDay(endText, QUIET_HOURS_KEY, "end"));
    }

    private Map<DayOfWeek, TimeWindow> parseTimeWindowMap(Object value, String key) {
        if (value == null) return Map.of();
        if (!(value instanceof Map<?, ?> raw)) {
            throw new IllegalArgumentException(key + " must be an object keyed by weekday name.");
        }
        Map<DayOfWeek, TimeWindow> result = new EnumMap<>(DayOfWeek.class);
        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            if (!(entry.getKey() instanceof String dayText) || dayText.isBlank()) {
                throw new IllegalArgumentException(key + " keys must be weekday names.");
            }
            DayOfWeek day;
            try {
                day = DayOfWeek.valueOf(dayText.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(key + " contains invalid weekday: " + dayText + ". Use MONDAY through SUNDAY.");
            }
            Object entryValue = entry.getValue();
            if (entryValue == null) {
                continue;
            }
            if (!(entryValue instanceof Map<?, ?> windowMap)) {
                throw new IllegalArgumentException(key + "." + dayText + " must be an object with start/end.");
            }
            Object startRaw = windowMap.get("start");
            Object endRaw = windowMap.get("end");
            if (!(startRaw instanceof String startText) || !(endRaw instanceof String endText)) {
                throw new IllegalArgumentException(key + "." + dayText + " must have start and end HH:mm strings.");
            }
            result.put(day, new TimeWindow(parseTimeOfDay(startText, key, dayText), parseTimeOfDay(endText, key, dayText)));
        }
        return result;
    }

    private LocalTime parseTimeOfDay(String text, String key, String dayText) {
        try {
            return LocalTime.parse(text.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + "." + dayText + " must use HH:mm time format.");
        }
    }

    private Map<String, Object> serializeTimeWindowMap(Map<DayOfWeek, TimeWindow> windows) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            TimeWindow window = windows.get(day);
            if (window != null) {
                result.put(day.name(), Map.of("start", window.start().toString(), "end", window.end().toString()));
            }
        }
        return result;
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
            if (AI_FEATURES_ENABLED_KEY.equals(key)) {
                return objectMapper.readValue(value, Boolean.class);
            }
            if (WORKING_HOURS_KEY.equals(key) || SLEEP_HOURS_KEY.equals(key)) {
                return objectMapper.readValue(value, new TypeReference<Map<String, Map<String, String>>>() {});
            }
            if (QUIET_HOURS_KEY.equals(key)) {
                return value == null || "null".equals(value) ? null : objectMapper.readValue(value, new TypeReference<Map<String, String>>() {});
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
            case AI_FEATURES_ENABLED_KEY -> parseBoolean(value, key);
            case WORKING_HOURS_KEY, SLEEP_HOURS_KEY -> parseTimeWindowMap(value, key);
            case HABIT_REMINDER_STYLE_KEY -> parseHabitReminderStyle(value, key);
            case TIMEZONE_KEY -> parseTimezone(value);
            case QUIET_HOURS_KEY -> parseQuietHours(value);
            default -> { }
        }
    }

    private String parseHabitReminderStyle(Object value, String key) {
        if (!(value instanceof String text) || !HABIT_REMINDER_STYLES.contains(text.trim())) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", HABIT_REMINDER_STYLES) + ".");
        }
        return text.trim();
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

    @Transactional(readOnly = true)
    public boolean isAiFeaturesEnabled() {
        return parseBoolean(getAll().get(AI_FEATURES_ENABLED_KEY), AI_FEATURES_ENABLED_KEY);
    }

    private boolean parseBoolean(Object value, String key) {
        if (value instanceof Boolean enabled) return enabled;
        if (value instanceof String text && ("true".equalsIgnoreCase(text.trim()) || "false".equalsIgnoreCase(text.trim()))) {
            return Boolean.parseBoolean(text.trim());
        }
        throw new IllegalArgumentException(key + " must be a boolean.");
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
