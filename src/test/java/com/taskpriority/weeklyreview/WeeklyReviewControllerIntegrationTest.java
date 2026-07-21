package com.taskpriority.weeklyreview;

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
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for WeeklyReviewController against H2, exercising the actual
 * WeeklyReviewService/WeeklyReviewRepository (and its collaborators: TaskService, HabitService,
 * ProjectService) stack, unlike WeeklyReviewControllerTest which mocks the service.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class WeeklyReviewControllerIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long createTask(String title, String status) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"description\":\"d\",\"status\":\"" + status + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    private long completeReview(String weekStartDate, String summary) throws Exception {
        String body = """
                {"weekStartDate":"%s","summary":"%s"}
                """.formatted(weekStartDate, summary);
        String response = mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    @Test
    void completeThenGetByIdAndGetAllRoundTripsRealData() throws Exception {
        long id = completeReview("2026-07-13", "Good week");

        mockMvc.perform(get("/api/v1/weekly-reviews/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) id))
                .andExpect(jsonPath("$.weekStartDate").value("2026-07-13"))
                .andExpect(jsonPath("$.summary").value("Good week"))
                .andExpect(jsonPath("$.completedAt").exists());

        mockMvc.perform(get("/api/v1/weekly-reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) id)));

        mockMvc.perform(get("/api/v1/weekly-reviews").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void currentDraftComputesRealOverdueAndCompletedTasks() throws Exception {
        LocalDate today = LocalDate.now();
        long overdueTaskId = createTask("Overdue task", "NOT_STARTED");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/v1/tasks/{id}/due-date", overdueTaskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"" + today.minusDays(3) + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/weekly-reviews/current-draft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekStartDate").exists())
                .andExpect(jsonPath("$.weekEndDate").exists())
                .andExpect(jsonPath("$.overdueTasks[*].id", hasItem((int) overdueTaskId)))
                .andExpect(jsonPath("$.completedTasks").isArray())
                .andExpect(jsonPath("$.habitPerformance").isArray())
                .andExpect(jsonPath("$.projectsAtRisk").isArray())
                .andExpect(jsonPath("$.staleTasks").isArray());
    }

    @Test
    void completeReviewWithCompleteDecisionMarksTaskDone() throws Exception {
        long taskId = createTask("Finish deck", "NOT_STARTED");

        String body = """
                {"weekStartDate":"2026-07-13","summary":"Wrapping up",
                 "decisions":[{"taskId":%d,"action":"COMPLETE"}]}
                """.formatted(taskId);
        mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/tasks/{id}", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));
    }

    @Test
    void completeRejectsMissingWeekStartDateWithApiErrorShape() throws Exception {
        mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("weekStartDate is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/weekly-reviews"));
    }

    @Test
    void completeRejectsRescheduleDecisionMissingNewDueDate() throws Exception {
        long taskId = createTask("Needs reschedule", "NOT_STARTED");

        String body = """
                {"weekStartDate":"2026-07-13","decisions":[{"taskId":%d,"action":"RESCHEDULE"}]}
                """.formatted(taskId);
        mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("newDueDate is required")));
    }

    @Test
    void getByIdReturnsNotFoundForMissingReview() throws Exception {
        mockMvc.perform(get("/api/v1/weekly-reviews/{id}", 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void reviewsAreIsolatedPerUser() throws Exception {
        long id = completeReview("2026-07-13", "Private summary");

        TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(get("/api/v1/weekly-reviews/{id}", id))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/weekly-reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
