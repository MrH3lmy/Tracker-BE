package com.taskpriority.focus;

import com.fasterxml.jackson.databind.JsonNode;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for FocusSessionController against H2, exercising the actual
 * FocusSessionService/repositories, unlike FocusSessionControllerTest which mocks the service.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class FocusSessionControllerIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long startSession() throws Exception {
        String response = mockMvc.perform(post("/api/v1/focus-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    @Test
    void startingASessionMakesItTheActiveSession() throws Exception {
        mockMvc.perform(post("/api/v1/focus-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("RUNNING"))
                .andExpect(jsonPath("$.taskId").doesNotExist());

        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void activeReturnsNoContentWhenNothingIsRunning() throws Exception {
        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isNoContent());
    }

    @Test
    void startingASecondSessionAbandonsTheFirst() throws Exception {
        long firstId = startSession();
        long secondId = startSession();

        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) secondId));

        LocalDate today = LocalDate.now();
        String response = mockMvc.perform(get("/api/v1/focus-sessions")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode sessions = jsonMapper.readTree(response);
        JsonNode first = findById(sessions, firstId);
        assertEquals("ABANDONED", first.get("status").asText());
    }

    private JsonNode findById(JsonNode array, long id) {
        for (JsonNode node : array) {
            if (node.get("id").asLong() == id) {
                return node;
            }
        }
        throw new AssertionError("No session with id " + id + " found in " + array);
    }

    @Test
    void pauseThenResumeRoundTripsStatus() throws Exception {
        long id = startSession();

        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/pause", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));

        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/resume", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void stopReturnsOkWithComputedActualMinutesAndNote() throws Exception {
        long id = startSession();

        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/stop", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Got a lot done\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.note").value("Got a lot done"))
                .andExpect(jsonPath("$.actualMinutes").value(org.hamcrest.Matchers.greaterThanOrEqualTo(0)));
    }

    @Test
    void listAndAnalyticsReflectCompletedSessions() throws Exception {
        long id = startSession();
        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/stop", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        LocalDate today = LocalDate.now();
        String response = mockMvc.perform(get("/api/v1/focus-sessions")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertTrue(findById(jsonMapper.readTree(response), id) != null);

        mockMvc.perform(get("/api/v1/focus-sessions/analytics")
                        .param("from", today.minusDays(1).toString())
                        .param("to", today.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionCount").value(1))
                .andExpect(jsonPath("$.totalMinutes").value(org.hamcrest.Matchers.greaterThanOrEqualTo(0)));
    }

    @Test
    void startRejectsNonPositiveTaskId() throws Exception {
        mockMvc.perform(post("/api/v1/focus-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("taskId")))
                .andExpect(jsonPath("$.path").value("/api/v1/focus-sessions"));
    }

    @Test
    void pausingAMissingSessionReturnsNotFound() throws Exception {
        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/pause", 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void otherUsersCannotPauseOrStopMySession() throws Exception {
        long id = startSession();

        TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(patch("/api/v1/focus-sessions/{id}/pause", id))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isNoContent());
    }
}
