package com.taskpriority.planning;

import com.taskpriority.settings.SettingsService;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class WorkingCalendarService {
    private final SettingsService settingsService;

    public WorkingCalendarService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    public CalendarSettings getCalendarSettings() {
        return new CalendarSettings(
                settingsService.getExcludedWeekdays(),
                settingsService.getHolidayDates(),
                settingsService.getDefaultDailyCapacityHours()
        );
    }

    public boolean isWorkingDay(LocalDate date) {
        CalendarSettings settings = getCalendarSettings();
        return isWorkingDay(date, settings);
    }

    public boolean isWorkingDay(LocalDate date, CalendarSettings settings) {
        return date != null
                && !settings.excludedWeekdays().contains(date.getDayOfWeek())
                && !settings.holidayDates().contains(date);
    }

    public int countWorkingDaysInclusive(LocalDate start, LocalDate end, CalendarSettings settings) {
        if (start == null || end == null || end.isBefore(start)) return 0;
        int days = 0;
        for (long offset = 0; offset <= ChronoUnit.DAYS.between(start, end); offset++) {
            if (isWorkingDay(start.plusDays(offset), settings)) days++;
        }
        return days;
    }

    public List<LocalDate> nextWorkingDays(LocalDate start, int count, CalendarSettings settings) {
        if (count <= 0) return List.of();
        java.util.ArrayList<LocalDate> days = new java.util.ArrayList<>();
        LocalDate cursor = start;
        while (days.size() < count) {
            if (isWorkingDay(cursor, settings)) days.add(cursor);
            cursor = cursor.plusDays(1);
        }
        return days;
    }

    public record CalendarSettings(
            List<DayOfWeek> excludedWeekdays,
            List<LocalDate> holidayDates,
            double defaultDailyCapacityHours
    ) {}
}
