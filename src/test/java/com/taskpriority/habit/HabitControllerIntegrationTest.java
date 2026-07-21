package com.taskpriority.habit;

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
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for HabitController against H2, exercising the actual
 * HabitService/HabitRepository/HabitCheckInRepository stack, unlike HabitControllerTest which
 * mocks the service.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class HabitControllerIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long createHabit(String title) throws Exception {
        String body = """
                {"title":"%s","description":"desc","area":"HEALTH","important":true,
                 "estimatedMinutes":5,"dailyTargetCount":2,
                 "recurrence":{"frequency":"DAILY","interval":1}}
                """.formatted(title);
        String response = mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    @Test
    void createThenGetByIdAndGetAllRoundTripsRealData() throws Exception {
        long id = createHabit("Drink water");

        mockMvc.perform(get("/api/v1/habits/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) id))
                .andExpect(jsonPath("$.title").value("Drink water"))
                .andExpect(jsonPath("$.description").value("desc"))
                .andExpect(jsonPath("$.area").value("HEALTH"))
                .andExpect(jsonPath("$.dailyTargetCount").value(2))
                .andExpect(jsonPath("$.todayCheckInCount").value(0))
                .andExpect(jsonPath("$.todayTargetMet").value(false))
                .andExpect(jsonPath("$.recurrence.frequency").value("DAILY"));

        mockMvc.perform(get("/api/v1/habits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) id)));
    }

    @Test
    void updateChangesPersistedFields() throws Exception {
        long id = createHabit("Drink water");

        mockMvc.perform(put("/api/v1/habits/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink more water","important":false,
                                 "reminderEnabled":true,"reminderTime":"09:30:00",
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Drink more water"))
                .andExpect(jsonPath("$.important").value(false))
                .andExpect(jsonPath("$.reminderEnabled").value(true))
                .andExpect(jsonPath("$.reminderTime").value("09:30:00"));

        mockMvc.perform(get("/api/v1/habits/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Drink more water"));
    }

    @Test
    void checkInIncrementsCountAndUndoDecrementsIt() throws Exception {
        long id = createHabit("Drink water");

        mockMvc.perform(patch("/api/v1/habits/{id}/check-in", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayCheckInCount").value(1))
                .andExpect(jsonPath("$.todayTargetMet").value(false));

        mockMvc.perform(patch("/api/v1/habits/{id}/check-in", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayCheckInCount").value(2))
                .andExpect(jsonPath("$.todayTargetMet").value(true));

        mockMvc.perform(delete("/api/v1/habits/{id}/check-in", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayCheckInCount").value(1))
                .andExpect(jsonPath("$.todayTargetMet").value(false));

        LocalDate today = LocalDate.now();
        String historyResponse = mockMvc.perform(get("/api/v1/habits/history")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        com.fasterxml.jackson.databind.JsonNode history = jsonMapper.readTree(historyResponse);
        boolean found = false;
        for (com.fasterxml.jackson.databind.JsonNode entry : history) {
            if (entry.get("habitId").asLong() == id) {
                org.junit.jupiter.api.Assertions.assertEquals(1, entry.get("count").asInt());
                found = true;
            }
        }
        org.junit.jupiter.api.Assertions.assertTrue(found, "Expected a history entry for habit " + id + " in " + historyResponse);
    }

    @Test
    void deleteRemovesTheHabitFromSubsequentListing() throws Exception {
        long id = createHabit("Drink water");

        mockMvc.perform(delete("/api/v1/habits/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/habits/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReturnsBadRequestWithApiErrorShapeWhenTitleMissing() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/habits"));
    }

    @Test
    void getByIdReturnsNotFoundForMissingHabit() throws Exception {
        mockMvc.perform(get("/api/v1/habits/{id}", 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void updateReturnsNotFoundForMissingHabit() throws Exception {
        mockMvc.perform(put("/api/v1/habits/{id}", 987654321L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","important":false,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void habitsAreIsolatedPerUser() throws Exception {
        long habitId = createHabit("My private habit");

        TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(get("/api/v1/habits/{id}", habitId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/habits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Another user cannot check into or delete a habit they don't own either.
        mockMvc.perform(patch("/api/v1/habits/{id}/check-in", habitId))
                .andExpect(status().isNotFound());
    }
}
