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
    void allowsLocalFrontendCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/v1/tasks")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("GET")));
    }

    @Test
    void endpointContracts() throws Exception {
        String body = """
                {"title":"Test Task","description":"d"}
                """;
        String createdTask = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                .readTree(createdTask).get("id").asLong();

        String noteBody = """
                {"title":"Task note","body":"remember this","taskId":%d}
                """.formatted(taskId);
        mockMvc.perform(post("/api/v1/notes").contentType(MediaType.APPLICATION_JSON).content(noteBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("PLAIN_TEXT"))
                .andExpect(jsonPath("$.taskId").value((int) taskId));
        mockMvc.perform(get("/api/v1/notes").param("taskId", String.valueOf(taskId)).param("q", "remember"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Task note"));
        mockMvc.perform(get("/api/v1/tasks/{id}/notes", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].body").value("remember this"));
        mockMvc.perform(get("/api/v1/tasks/{id}/detail", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.task.id").value((int) taskId))
                .andExpect(jsonPath("$.task.title").value("Test Task"))
                .andExpect(jsonPath("$.notes[0].body").value("remember this"));
        mockMvc.perform(get("/api/v1/tasks")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/today")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/weekly")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].task.title").value("Test Task"))
                .andExpect(jsonPath("$[0].recommendedAction").exists())
                .andExpect(jsonPath("$[0].reasonCodes").isArray())
                .andExpect(jsonPath("$[0].explanation").exists())
                .andExpect(jsonPath("$[0].confidence").exists())
                .andExpect(jsonPath("$[0].blockerWarnings").isArray())
                .andExpect(jsonPath("$[0].rank").value(1));
        mockMvc.perform(get("/api/v1/matrix")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/dashboard")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/calendar/month").param("year","2026").param("month","5")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/calendar/export.ics")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/settings")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/settings").contentType(MediaType.APPLICATION_JSON).content("{\"theme\":\"dark\"}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/import/csv").contentType(MediaType.TEXT_PLAIN).content("title\nImported task")).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/import/tasks").contentType(MediaType.TEXT_PLAIN).content("title,description,dueDate,status,important,area,effort\nImported task,desc,2026-05-01,BACKLOG,true,WORK,MEDIUM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1));

        mockMvc.perform(get("/api/v1/calendar/export.ics"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=tasks-calendar.ics"));

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(jsonPath("$.completionRate").exists())
                .andExpect(jsonPath("$.byStatus").exists())
                .andExpect(jsonPath("$.byPriorityCategory").exists());
    }
}
