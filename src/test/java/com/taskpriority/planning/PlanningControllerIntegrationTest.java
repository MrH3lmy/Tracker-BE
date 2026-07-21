package com.taskpriority.planning;

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

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PlanningController exposes only parameterless GET endpoints (/today, /weekly,
 * /recommendations, /project-board) - there are no query params or path variables to feed
 * malformed/out-of-range values into, and no single-resource-by-id lookups, so there is no
 * reachable 400 or 404 case for this controller. Coverage here instead targets the
 * previously-untested branches in the underlying services: recommendation ranking/reason
 * codes across competing tasks, the today/overdue split, and project-board track/phase
 * grouping.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class PlanningControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void recommendationsRanksOverdueImportantTaskAboveNormalBacklogTask() throws Exception {
        LocalDate overdueDate = LocalDate.now().minusDays(3);
        long overdueTaskId = createTask("""
                {"title":"Overdue important task","description":"d","area":"WORK","important":true,"dueDate":"%s","status":"NOT_STARTED"}
                """.formatted(overdueDate));
        long backlogTaskId = createTask("""
                {"title":"Someday backlog task","description":"d","area":"WORK","important":false,"status":"BACKLOG"}
                """);

        mockMvc.perform(get("/api/v1/planning/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].task.id").value((int) overdueTaskId))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[0].reasonCodes").value(hasItem("DUE_OVERDUE")))
                .andExpect(jsonPath("$[0].explanation").value("Overdue and needs attention now."))
                .andExpect(jsonPath("$[0].recommendedAction").value("Do next"))
                .andExpect(jsonPath("$[1].task.id").value((int) backlogTaskId))
                .andExpect(jsonPath("$[1].rank").value(2))
                .andExpect(jsonPath("$[1].reasonCodes").value(hasItem("BACKLOG_CANDIDATE")));
    }

    @Test
    void recommendationsExcludeNonWorkAreaTasks() throws Exception {
        createTask("""
                {"title":"Personal errand","description":"d","area":"PERSONAL","important":true,"status":"NOT_STARTED"}
                """);

        mockMvc.perform(get("/api/v1/planning/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].task.title", org.hamcrest.Matchers.not(hasItem("Personal errand"))));
    }

    @Test
    void todaySeparatesOverdueFromDueTodayTasks() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        long overdueTaskId = createTask("""
                {"title":"Overdue work task","description":"d","area":"WORK","dueDate":"%s","status":"NOT_STARTED"}
                """.formatted(yesterday));
        long dueTodayTaskId = createTask("""
                {"title":"Due today work task","description":"d","area":"WORK","dueDate":"%s","status":"NOT_STARTED"}
                """.formatted(today));

        mockMvc.perform(get("/api/v1/planning/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overdue[*].id", hasItem((int) overdueTaskId)))
                .andExpect(jsonPath("$.overdue[*].id", org.hamcrest.Matchers.not(hasItem((int) dueTodayTaskId))))
                .andExpect(jsonPath("$.dueToday[*].id", hasItem((int) dueTodayTaskId)))
                .andExpect(jsonPath("$.dueToday[*].id", org.hamcrest.Matchers.not(hasItem((int) overdueTaskId))));
    }

    @Test
    void projectBoardGroupsTasksByTrackPhaseAndStatusWithCapacityRisk() throws Exception {
        createTask("""
                {"title":"Design phase task","description":"d","area":"WORK","track":"Alpha","phase":"Design","status":"IN_PROGRESS","estimatedMinutes":120}
                """);

        mockMvc.perform(get("/api/v1/planning/project-board"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.columns.length()").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.columns[*].track", hasItem("Alpha")))
                .andExpect(jsonPath("$.columns[*].phase", hasItem("Design")))
                .andExpect(jsonPath("$.risk.level").exists())
                .andExpect(jsonPath("$.risk.reason").exists())
                .andExpect(jsonPath("$.calendar.excludedWeekdays").isArray());
    }

    private long createTask(String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
