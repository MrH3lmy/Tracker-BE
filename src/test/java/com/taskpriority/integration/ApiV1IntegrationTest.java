package com.taskpriority.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class ApiV1IntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

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
    void allowsLocalFrontendScreenshotToolCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/v1/notes/1/tools/screenshot")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")));
    }


    @Test
    void taskDetailReturnsScreenshotsInNavigationOrder() throws Exception {
        long taskId = createTask("Screenshot task");
        long laterNoteId = createNote(taskId, "Later note", 20);
        long firstNoteId = createNote(taskId, "First note", 10);
        long unrelatedTaskId = createTask("Other screenshot task");
        long unrelatedNoteId = createNote(unrelatedTaskId, "Other note", 1);

        long laterFirstAttachmentId = uploadScreenshot(laterNoteId, "later-a.png");
        long laterSecondAttachmentId = uploadScreenshot(laterNoteId, "later-b.png");
        long firstAttachmentId = uploadScreenshot(firstNoteId, "first-a.png");
        uploadScreenshot(unrelatedNoteId, "other-a.png");

        mockMvc.perform(get("/api/v1/tasks/{id}/detail", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.screenshots.length()").value(3))
                .andExpect(jsonPath("$.screenshots[0].id").value((int) firstAttachmentId))
                .andExpect(jsonPath("$.screenshots[0].noteId").value((int) firstNoteId))
                .andExpect(jsonPath("$.screenshots[0].fileName").value("first-a.png"))
                .andExpect(jsonPath("$.screenshots[0].downloadUrl").value("http://localhost/api/v1/notes/" + firstNoteId + "/screenshots/" + firstAttachmentId))
                .andExpect(jsonPath("$.screenshots[1].id").value((int) laterFirstAttachmentId))
                .andExpect(jsonPath("$.screenshots[1].noteId").value((int) laterNoteId))
                .andExpect(jsonPath("$.screenshots[1].fileName").value("later-a.png"))
                .andExpect(jsonPath("$.screenshots[2].id").value((int) laterSecondAttachmentId))
                .andExpect(jsonPath("$.screenshots[2].noteId").value((int) laterNoteId))
                .andExpect(jsonPath("$.screenshots[2].fileName").value("later-b.png"));
    }

    private long createTask(String title) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    private long createNote(long taskId, String title, int displayOrder) throws Exception {
        String response = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"body\":\"body\",\"taskId\":" + taskId + ",\"displayOrder\":" + displayOrder + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    private long uploadScreenshot(long noteId, String fileName) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", fileName, "image/png", new byte[]{1, 2, 3});
        String response = mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = jsonMapper.readTree(response);
        return json.get("id").asLong();
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
                .andExpect(jsonPath("$.notes[0].body").value("remember this"))
                .andExpect(jsonPath("$.screenshots").isArray());
        mockMvc.perform(get("/api/v1/tasks")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/today")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/weekly")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/planning/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].task.title", hasItem("Test Task")))
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
