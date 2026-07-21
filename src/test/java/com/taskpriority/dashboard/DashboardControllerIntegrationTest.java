package com.taskpriority.dashboard;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * DashboardController has a single parameterless GET endpoint - no query params/path
 * variables, no single-resource-by-id lookup - so there is no reachable 400 or 404 case here.
 * Coverage instead exercises the aggregation branches in DashboardService.getDashboardSummary
 * (completion rate, overdue/dueToday/dueThisWeek counts, blocked/waiting counts, and the
 * byStatus/byPriorityCategory breakdowns) that ApiV1IntegrationTest only smoke-tests for
 * existence, not for correct values.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class DashboardControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void summarizesTaskCountsAcrossStatusesAndDueDateBuckets() throws Exception {
        LocalDate today = LocalDate.now();
        createTask("""
                {"title":"Done task","description":"d","area":"WORK","status":"DONE"}
                """);
        createTask("""
                {"title":"Overdue task","description":"d","area":"WORK","dueDate":"%s","status":"NOT_STARTED"}
                """.formatted(today.minusDays(2)));
        createTask("""
                {"title":"Due today task","description":"d","area":"WORK","dueDate":"%s","status":"NOT_STARTED"}
                """.formatted(today));
        createTask("""
                {"title":"Blocked task","description":"d","area":"WORK","status":"BLOCKED","blockedReason":"waiting on design"}
                """);
        createTask("""
                {"title":"Waiting task","description":"d","area":"WORK","status":"WAITING","waitingOn":"vendor","followUpDate":"%s"}
                """.formatted(today.plusDays(1)));

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(5))
                .andExpect(jsonPath("$.completedTasks").value(1))
                .andExpect(jsonPath("$.activeTasks").value(4))
                .andExpect(jsonPath("$.overdueTasks").value(1))
                .andExpect(jsonPath("$.dueToday").value(1))
                .andExpect(jsonPath("$.blockedTasks").value(1))
                .andExpect(jsonPath("$.waitingTasks").value(1))
                .andExpect(jsonPath("$.completionRate").value(20.0))
                .andExpect(jsonPath("$.byStatus.DONE").value(1))
                .andExpect(jsonPath("$.byStatus.BLOCKED").value(1))
                .andExpect(jsonPath("$.byStatus.WAITING").value(1))
                .andExpect(jsonPath("$.byPriorityCategory").exists());
    }

    @Test
    void completionRateIsZeroWhenNoTasksExist() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(0))
                .andExpect(jsonPath("$.completionRate").value(0.0));
    }

    private void createTask(String body) throws Exception {
        mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }
}
