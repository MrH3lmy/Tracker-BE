package com.taskpriority.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class ApiV1IntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test
    void endpointContracts() throws Exception {
        String body = """
                {"title":"Test Task","description":"d"}
                """;
        mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mockMvc.perform(get("/api/v1/tasks")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/today")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/weekly")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/matrix")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/dashboard")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/calendar/month").param("year","2026").param("month","5")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/calendar/export.ics")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/settings")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content("{\"theme\":\"dark\"}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/import/csv").contentType(MediaType.TEXT_PLAIN).content("title\nImported task")).andExpect(status().isOk());
    }
}
