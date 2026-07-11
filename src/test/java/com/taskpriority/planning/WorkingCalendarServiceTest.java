package com.taskpriority.planning;

import com.taskpriority.settings.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WorkingCalendarServiceTest {

    private SettingsService settingsService;
    private WorkingCalendarService calendarService;

    @BeforeEach
    void setUp() {
        settingsService = mock(SettingsService.class);
        calendarService = new WorkingCalendarService(settingsService);
    }

    private WorkingCalendarService.CalendarSettings settings(List<DayOfWeek> excluded, List<LocalDate> holidays) {
        return new WorkingCalendarService.CalendarSettings(excluded, holidays, 8.0);
    }

    @Test
    void getCalendarSettingsDelegatesToSettingsService() {
        when(settingsService.getExcludedWeekdays()).thenReturn(List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));
        when(settingsService.getHolidayDates()).thenReturn(List.of(LocalDate.of(2026, 1, 1)));
        when(settingsService.getDefaultDailyCapacityHours()).thenReturn(6.5);

        WorkingCalendarService.CalendarSettings result = calendarService.getCalendarSettings();

        assertEquals(List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), result.excludedWeekdays());
        assertEquals(List.of(LocalDate.of(2026, 1, 1)), result.holidayDates());
        assertEquals(6.5, result.defaultDailyCapacityHours());
    }

    @Test
    void isWorkingDayReturnsFalseForNullDate() {
        WorkingCalendarService.CalendarSettings settings = settings(List.of(), List.of());
        assertFalse(calendarService.isWorkingDay(null, settings));
    }

    @Test
    void isWorkingDayReturnsFalseForExcludedWeekday() {
        WorkingCalendarService.CalendarSettings settings = settings(List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), List.of());
        LocalDate saturday = LocalDate.of(2026, 7, 11); // a Saturday
        assertEquals(DayOfWeek.SATURDAY, saturday.getDayOfWeek());
        assertFalse(calendarService.isWorkingDay(saturday, settings));
    }

    @Test
    void isWorkingDayReturnsFalseForHoliday() {
        LocalDate holiday = LocalDate.of(2026, 7, 13); // a Monday
        WorkingCalendarService.CalendarSettings settings = settings(List.of(), List.of(holiday));
        assertFalse(calendarService.isWorkingDay(holiday, settings));
    }

    @Test
    void isWorkingDayReturnsTrueForOrdinaryWeekday() {
        LocalDate monday = LocalDate.of(2026, 7, 13);
        WorkingCalendarService.CalendarSettings settings = settings(List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), List.of());
        assertTrue(calendarService.isWorkingDay(monday, settings));
    }

    @Test
    void countWorkingDaysInclusiveReturnsZeroWhenEndBeforeStart() {
        WorkingCalendarService.CalendarSettings settings = settings(List.of(), List.of());
        assertEquals(0, calendarService.countWorkingDaysInclusive(
                LocalDate.of(2026, 7, 13), LocalDate.of(2026, 7, 10), settings));
    }

    @Test
    void countWorkingDaysInclusiveReturnsZeroForNullBounds() {
        WorkingCalendarService.CalendarSettings settings = settings(List.of(), List.of());
        assertEquals(0, calendarService.countWorkingDaysInclusive(null, LocalDate.now(), settings));
        assertEquals(0, calendarService.countWorkingDaysInclusive(LocalDate.now(), null, settings));
    }

    @Test
    void countWorkingDaysInclusiveExcludesWeekendsAndHolidays() {
        // Mon 2026-07-13 .. Sun 2026-07-19: 5 weekdays, one of which (Wed) is a holiday.
        LocalDate start = LocalDate.of(2026, 7, 13);
        LocalDate end = LocalDate.of(2026, 7, 19);
        LocalDate holiday = LocalDate.of(2026, 7, 15);
        WorkingCalendarService.CalendarSettings settings = settings(
                List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), List.of(holiday));

        int workingDays = calendarService.countWorkingDaysInclusive(start, end, settings);

        assertEquals(4, workingDays);
    }

    @Test
    void nextWorkingDaysReturnsEmptyForNonPositiveCount() {
        WorkingCalendarService.CalendarSettings settings = settings(List.of(), List.of());
        assertEquals(List.of(), calendarService.nextWorkingDays(LocalDate.now(), 0, settings));
        assertEquals(List.of(), calendarService.nextWorkingDays(LocalDate.now(), -1, settings));
    }

    @Test
    void nextWorkingDaysSkipsWeekendsAndHolidays() {
        // Starting Friday 2026-07-10, ask for 3 working days, with Monday 7/13 a holiday.
        LocalDate friday = LocalDate.of(2026, 7, 10);
        LocalDate holiday = LocalDate.of(2026, 7, 13);
        WorkingCalendarService.CalendarSettings settings = settings(
                List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), List.of(holiday));

        List<LocalDate> result = calendarService.nextWorkingDays(friday, 3, settings);

        assertEquals(List.of(
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 7, 14),
                LocalDate.of(2026, 7, 15)
        ), result);
    }
}
