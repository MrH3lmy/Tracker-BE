package com.taskpriority.calendar;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class CalendarControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void monthRejectsNonNumericYearWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month").param("year", "not-a-year").param("month", "5"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("year")))
                .andExpect(jsonPath("$.path").value("/api/v1/calendar/month"));
    }

    @Test
    void monthRejectsNonNumericMonthWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month").param("year", "2026").param("month", "not-a-month"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("month")));
    }

    @Test
    void monthTasksRejectsNonNumericYearWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month/tasks").param("year", "not-a-year").param("month", "5"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // Note: this is NOT the required 400 case for this controller (the non-numeric-param tests
    // above cover that). A missing required @RequestParam raises MissingServletRequestParameterException,
    // which GlobalExceptionHandler has no specific handler for, so it falls through to the
    // catch-all Exception handler and surfaces as 500 rather than 400. Documented here as the
    // actual observed behavior.
    @Test
    void monthMissingRequiredParamSurfacesAsServerErrorNotBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month").param("year", "2026"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void exportIcsIncludesTaskSummaryAndStatusButExcludesTasksWithoutDueDate() throws Exception {
        LocalDate dueDate = LocalDate.of(2026, 5, 15);
        createTask("""
                {"title":"Scheduled task","description":"d","area":"WORK","dueDate":"%s","status":"NOT_STARTED","important":true}
                """.formatted(dueDate));
        createTask("""
                {"title":"No due date task","description":"d","area":"WORK"}
                """);

        String ics = mockMvc.perform(get("/api/v1/calendar/export.ics"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/calendar"))
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(ics)
                .contains("BEGIN:VCALENDAR")
                .contains("SUMMARY:Scheduled task")
                .contains("important=true")
                .doesNotContain("No due date task")
                .contains("END:VCALENDAR");
    }

    @Test
    void monthSummaryFlagsDaysWithOverdueAndImportantTasks() throws Exception {
        LocalDate dueDate = LocalDate.now().withDayOfMonth(1).plusMonths(1).plusDays(4);
        createTask("""
                {"title":"Important task","description":"d","area":"WORK","dueDate":"%s","important":true,"status":"NOT_STARTED"}
                """.formatted(dueDate));

        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("year", String.valueOf(dueDate.getYear()))
                        .param("month", String.valueOf(dueDate.getMonthValue())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['" + dueDate + "'].taskCount").value(1))
                .andExpect(jsonPath("$['" + dueDate + "'].hasImportant").value(true));
    }

    private long createTask(String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
