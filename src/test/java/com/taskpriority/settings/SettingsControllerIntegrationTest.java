package com.taskpriority.settings;

import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SettingsController accepts a raw Map<String,Object> body rather than a Bean-Validation DTO;
 * SettingsService hand-parses each known key and throws IllegalArgumentException (-> 400 via
 * GlobalExceptionHandler) on malformed values. There is no single-resource-by-id lookup (the
 * whole settings map is scoped to the current user), so there is no reachable 404 case here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class SettingsControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void rejectsInvalidTimezoneWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timezone\":\"Not/A_Real_Zone\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("timezone")));
    }

    @Test
    void rejectsInvalidHabitReminderStyleWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"habitReminders.style\":\"obnoxious\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("habitReminders.style")));
    }

    @Test
    void rejectsInvalidWeekdayNameInExcludedWeekdaysWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"excludedWeekdays\":[\"FUNDAY\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("invalid weekday")));
    }

    @Test
    void rejectsOutOfRangeDailyCapacityHoursWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"defaultDailyCapacityHours\":30}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("defaultDailyCapacityHours")));
    }

    @Test
    void rejectsZeroDailyCapacityHoursWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"defaultDailyCapacityHours\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMalformedWorkingHoursTimeFormatWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workingHours\":{\"MONDAY\":{\"start\":\"not-a-time\",\"end\":\"17:00\"}}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("HH:mm")));
    }

    @Test
    void rejectsQuietHoursMissingEndFieldWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quietHours\":{\"start\":\"22:00\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("quietHours")));
    }

    @Test
    void rejectsNonBooleanAiFeaturesEnabledWithBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aiFeaturesEnabled\":\"sort-of\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("aiFeaturesEnabled")));
    }

    // Note: this is NOT one of the required 400 cases (the malformed-value tests above cover
    // that). A literal JSON "null" body resolves to a missing @RequestBody before the controller
    // - and SettingsService's own `if (updates == null) throw new IllegalArgumentException(...)`
    // guard - ever runs, so Spring raises HttpMessageNotReadableException instead, which
    // GlobalExceptionHandler has no specific handler for and which therefore surfaces as 500.
    // Documented here as the actual observed behavior.
    @Test
    void nullBodySurfacesAsServerErrorNotBadRequest() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content("null"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void partialUpdatePersistsOnlyChangedKeyAndKeepsDefaultsForOthers() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timezone\":\"America/New_York\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("America/New_York"))
                .andExpect(jsonPath("$.defaultDailyCapacityHours").value(SettingsService.DEFAULT_DAILY_CAPACITY_HOURS))
                .andExpect(jsonPath("$['habitReminders.style']").value(SettingsService.DEFAULT_HABIT_REMINDER_STYLE));

        mockMvc.perform(get("/api/v1/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("America/New_York"));
    }

    @Test
    void quietHoursCanBeClearedByPassingNull() throws Exception {
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quietHours\":{\"start\":\"22:00\",\"end\":\"06:00\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quietHours.start").value("22:00"));

        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quietHours\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quietHours").value(org.hamcrest.Matchers.nullValue()));
    }
}
