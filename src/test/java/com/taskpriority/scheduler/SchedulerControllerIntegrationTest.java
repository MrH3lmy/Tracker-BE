package com.taskpriority.scheduler;

import com.fasterxml.jackson.databind.json.JsonMapper;
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

import java.time.LocalDate;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class SchedulerControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    // ---- 400: malformed date query params ----

    @Test
    void dayRejectsMalformedDateWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/scheduler/day").param("date", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("date")));
    }

    @Test
    void weekRejectsMalformedStartDateWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/scheduler/week").param("startDate", "05-01-2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // Note: this is NOT the required 400 case for this controller (the malformed-date tests above
    // cover that). A missing required @RequestParam raises MissingServletRequestParameterException,
    // which GlobalExceptionHandler has no specific handler for, so it falls through to the
    // catch-all Exception handler and surfaces as 500 rather than 400. Documented as observed behavior.
    @Test
    void dayMissingDateParamSurfacesAsServerErrorNotBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/scheduler/day"))
                .andExpect(status().isInternalServerError());
    }

    // ---- 400: bean validation on schedule request bodies ----

    @Test
    void scheduleTaskRejectsMissingRequiredFieldsWithBadRequest() throws Exception {
        long taskId = createTask("""
                {"title":"Schedulable task","description":"d","area":"WORK"}
                """);

        mockMvc.perform(put("/api/v1/scheduler/tasks/{taskId}", taskId)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("scheduledDate")));
    }

    @Test
    void scheduleTaskRejectsNonPositiveDurationWithBadRequest() throws Exception {
        long taskId = createTask("""
                {"title":"Schedulable task 2","description":"d","area":"WORK"}
                """);

        mockMvc.perform(put("/api/v1/scheduler/tasks/{taskId}", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scheduledDate":"2026-05-01","startTime":"09:00:00","durationMinutes":0}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("durationMinutes")));
    }

    @Test
    void scheduleHabitRejectsMissingRequiredFieldsWithBadRequest() throws Exception {
        long habitId = createHabit();

        mockMvc.perform(put("/api/v1/scheduler/habits/{habitId}", habitId)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("startTime")));
    }

    @Test
    void autoScheduleRejectsEndDateBeforeStartDateWithBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/scheduler/auto-schedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startDate":"2026-05-10","endDate":"2026-05-01"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("endDate must be on or after startDate")));
    }

    @Test
    void autoScheduleRejectsMissingStartDateWithBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/scheduler/auto-schedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"endDate":"2026-05-10"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ---- 404: single-resource-by-id lookups ----

    @Test
    void scheduleTaskForUnknownTaskIdIsNotFound() throws Exception {
        mockMvc.perform(put("/api/v1/scheduler/tasks/{taskId}", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scheduledDate":"2026-05-01","startTime":"09:00:00"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("999999")));
    }

    @Test
    void scheduleHabitForUnknownHabitIdIsNotFound() throws Exception {
        mockMvc.perform(put("/api/v1/scheduler/habits/{habitId}", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scheduledDate":"2026-05-01","startTime":"09:00:00"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void suggestionForUnknownTaskIdIsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/scheduler/tasks/{taskId}/suggestion", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void suggestionForUnknownHabitIdIsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/scheduler/habits/{habitId}/suggestion", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // ---- edge cases: unschedule of an unscheduled item is a no-op, not a 404 ----

    @Test
    void unscheduleUnknownTaskIdStillReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/scheduler/tasks/{taskId}", 999999L))
                .andExpect(status().isNoContent());
    }

    @Test
    void unscheduleUnknownHabitIdStillReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/scheduler/habits/{habitId}", 999999L))
                .andExpect(status().isNoContent());
    }

    // ---- happy path: a found suggestion returns 200 with a populated slot body ----

    @Test
    void suggestionReturnsSlotBodyWhenAvailableTimeExists() throws Exception {
        long taskId = createTask("""
                {"title":"Findable slot task","description":"d","area":"PERSONAL","estimatedMinutes":30}
                """);

        // Default sleep hours (23:00-07:00) leave the rest of each day open, so a PERSONAL-area
        // task should always find a waking-hours slot within the 30-day search horizon.
        mockMvc.perform(get("/api/v1/scheduler/tasks/{taskId}/suggestion", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scheduledDate").exists())
                .andExpect(jsonPath("$.startTime").exists())
                .andExpect(jsonPath("$.durationMinutes").value(30));
    }

    private long createTask(String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    private long createHabit() throws Exception {
        String response = mockMvc.perform(post("/api/v1/habits").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Daily habit","area":"HEALTH","important":false,"reminderEnabled":false,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
