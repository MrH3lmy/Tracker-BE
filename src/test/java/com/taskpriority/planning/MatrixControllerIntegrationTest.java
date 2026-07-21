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

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MatrixController has a single parameterless GET endpoint - no query params/path variables to
 * feed malformed values into, and no single-resource-by-id lookup, so there is no reachable
 * 400 or 404 case here. Coverage instead exercises the untested branch of PriorityEngine's
 * Eisenhower-matrix categorization (important+urgent -> DO_NOW, neither -> DELETE) as surfaced
 * through the endpoint.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class MatrixControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void groupsTasksByPriorityCategoryAcrossTheMatrix() throws Exception {
        LocalDate today = LocalDate.now();
        long doNowTaskId = createTask("""
                {"title":"Do now task","description":"d","area":"WORK","important":true,"dueDate":"%s"}
                """.formatted(today));
        long deleteTaskId = createTask("""
                {"title":"Someday task","description":"d","area":"WORK","important":false}
                """);

        mockMvc.perform(get("/api/v1/matrix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DO_NOW[*].id", hasItem((int) doNowTaskId)))
                .andExpect(jsonPath("$.DELETE[*].id", hasItem((int) deleteTaskId)))
                .andExpect(jsonPath("$.DO_NOW[*].id", org.hamcrest.Matchers.not(hasItem((int) deleteTaskId))));
    }

    private long createTask(String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
