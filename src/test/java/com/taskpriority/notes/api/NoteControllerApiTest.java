package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.Task;
import com.taskpriority.repository.NoteAttachmentRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.core.env.Environment;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:notes-api-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.notes.screenshots.max-file-size-bytes=16"
})
class NoteControllerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NoteAttachmentRepository noteAttachmentRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private Environment environment;

    @BeforeEach
    void cleanDatabase() {
        noteAttachmentRepository.deleteAll();
        noteRepository.deleteAll();
        taskRepository.deleteAll();
    }

    @Test
    void screenshotToolPreflightIncludesCorsHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/notes/{id}/tools/screenshot", 123L)
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void createGeneralNote() throws Exception {
        String payload = """
                {"title":"General note","body":"Remember this later"}
                """;

        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("General note"))
                .andExpect(jsonPath("$.body").value("Remember this later"))
                .andExpect(jsonPath("$.contentType").value("PLAIN_TEXT"))
                .andExpect(jsonPath("$.taskId").doesNotExist())
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }


    @Test
    void createGeneralNoteStoresNormalizedTags() throws Exception {
        String payload = """
                {"title":"Tagged note","body":"Remember this later","tags":["Backend"," backend ","API"]}
                """;

        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Tagged note"))
                .andExpect(jsonPath("$.tags", hasSize(2)))
                .andExpect(jsonPath("$.tags", hasItem("api")))
                .andExpect(jsonPath("$.tags", hasItem("backend")));
    }

    @Test
    void createTaskLinkedNoteWhenTaskExists() throws Exception {
        Task task = saveTask("Task with notes");
        String payload = """
                {"title":"Task note","body":"Do this with the task","contentType":"MARKDOWN","taskId":%d}
                """.formatted(task.getId());

        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Task note"))
                .andExpect(jsonPath("$.body").value("Do this with the task"))
                .andExpect(jsonPath("$.contentType").value("MARKDOWN"))
                .andExpect(jsonPath("$.taskId").value(task.getId().intValue()));
    }

    @Test
    void createTaskLinkedNoteReturnsNotFoundWhenTaskDoesNotExist() throws Exception {
        String payload = """
                {"title":"Missing task note","body":"Cannot link this","taskId":999999}
                """;

        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Task with id 999999 not found"))
                .andExpect(jsonPath("$.path").value("/api/v1/notes"));
    }

    @Test
    void createNoteReturnsValidationErrorsForBlankTitleAndBody() throws Exception {
        String payload = """
                {"title":"   ","body":""}
                """;

        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("title is required")))
                .andExpect(jsonPath("$.message").value(containsString("body is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/notes"));
    }


    @Test
    void findByTaskIdReturnsOkWhenTaskExists() throws Exception {
        Task task = saveTask("Task with notes endpoint");

        mockMvc.perform(get("/api/v1/notes").param("taskId", task.getId().toString()))
                .andExpect(status().isOk());
    }

    @Test
    void findByTaskIdReturnsEmptyArrayWhenTaskHasNoNotes() throws Exception {
        Task task = saveTask("Task without notes");

        mockMvc.perform(get("/api/v1/notes").param("taskId", task.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }


    @Test
    void findAllReturnsBadRequestForInvalidCreatedFromDate() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("createdFrom", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("Date query parameters must use ISO date")))
                .andExpect(jsonPath("$.path").value("/api/v1/notes"));
    }

    @Test
    void findAllReturnsBadRequestForInvalidSortBy() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("sortBy", "priority"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("sortBy must be one of")))
                .andExpect(jsonPath("$.message").value(containsString("createdAt")))
                .andExpect(jsonPath("$.path").value("/api/v1/notes"));
    }

    @Test
    void findAllReturnsBadRequestForInvalidSortDirection() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("sortDirection", "sideways"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("sortDirection must be one of: asc, desc"))
                .andExpect(jsonPath("$.path").value("/api/v1/notes"));
    }

    @Test
    void findAllSearchesNotesByTitleFragment() throws Exception {
        createNote("Sprint retro ideas", "Discuss team improvements", null);
        createNote("Deployment checklist", "Review release steps", null);
        createNote("Design review", "Capture feedback", null);

        mockMvc.perform(get("/api/v1/notes").param("q", "retro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Sprint retro ideas"))
                .andExpect(jsonPath("$[0].body").value("Discuss team improvements"));
    }

    @Test
    void findAllSearchesNotesByBodyFragment() throws Exception {
        createNote("Meeting agenda", "Plan the launch messaging", null);
        createNote("Bug triage", "Prioritize backend defects", null);
        createNote("Refactor notes", "Simplify service boundaries", null);

        mockMvc.perform(get("/api/v1/notes").param("q", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Bug triage"))
                .andExpect(jsonPath("$[0].body").value("Prioritize backend defects"));
    }

    @Test
    void findAllFiltersByMarkdownContentType() throws Exception {
        createNote("Markdown runbook", "# Deploy\nFollow markdown steps", null, "MARKDOWN");
        createNote("Plain text checklist", "Follow plain text steps", null, "PLAIN_TEXT");
        createNote("Json payload", "{\"status\":\"ready\"}", null, "JSON");

        mockMvc.perform(get("/api/v1/notes").param("contentType", "MARKDOWN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Markdown runbook"))
                .andExpect(jsonPath("$[0].contentType").value("MARKDOWN"))
                .andExpect(jsonPath("$[*].contentType", everyItem(is("MARKDOWN"))))
                .andExpect(jsonPath("$[*].contentType", not(hasItem("PLAIN_TEXT"))))
                .andExpect(jsonPath("$[*].contentType", not(hasItem("JSON"))));
    }


    @Test
    void findAllFiltersByTag() throws Exception {
        createNote("Backend runbook", "Deploy the API", null, "MARKDOWN", "backend", "runbook");
        createNote("Frontend runbook", "Deploy the UI", null, "MARKDOWN", "frontend", "runbook");
        createNote("Backend bug", "Triage service defect", null, "PLAIN_TEXT", "backend");

        mockMvc.perform(get("/api/v1/notes").param("tag", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", hasItem("Backend runbook")))
                .andExpect(jsonPath("$[*].title", hasItem("Backend bug")))
                .andExpect(jsonPath("$[*].title", not(hasItem("Frontend runbook"))));
    }

    @Test
    void findAllTagModeAnyWithEmptyTagListDoesNotFilterResults() throws Exception {
        createNote("Tagged runbook", "Deploy the API", null, "MARKDOWN", "backend");
        createNote("Untagged note", "Capture general context", null, "PLAIN_TEXT");

        mockMvc.perform(get("/api/v1/notes")
                        .param("tagMode", "any")
                        .param("tag", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", hasItem("Tagged runbook")))
                .andExpect(jsonPath("$[*].title", hasItem("Untagged note")));
    }

    @Test
    void findByTaskIdAndQuerySearchesTaskLinkedNoteBodyFragment() throws Exception {
        Task selectedTask = saveTask("Task with searchable notes");
        Task otherTask = saveTask("Other searchable task");
        createNote("Selected implementation note", "Use lower coalesce body predicate", selectedTask.getId());
        createNote("Selected unrelated note", "Does not contain the target phrase", selectedTask.getId());
        createNote("Other task note", "Use lower coalesce body predicate", otherTask.getId());
        createNote("General matching note", "Use lower coalesce body predicate", null);

        mockMvc.perform(get("/api/v1/notes")
                        .param("taskId", selectedTask.getId().toString())
                        .param("q", "coalesce body"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Selected implementation note"))
                .andExpect(jsonPath("$[0].body").value("Use lower coalesce body predicate"))
                .andExpect(jsonPath("$[0].taskId").value(selectedTask.getId().intValue()));
    }

    @Test
    void findByTaskIdReturnsOnlyNotesLinkedToThatTask() throws Exception {
        Task selectedTask = saveTask("Selected task");
        Task otherTask = saveTask("Other task");
        createNote("Selected task note", "Selected body", selectedTask.getId());
        createNote("Other task note", "Other body", otherTask.getId());
        createNote("General note", "General body", null);

        mockMvc.perform(get("/api/v1/notes").param("taskId", selectedTask.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Selected task note"))
                .andExpect(jsonPath("$[0].body").value("Selected body"))
                .andExpect(jsonPath("$[0].taskId").value(selectedTask.getId().intValue()));
    }

    @Test
    void updateNoteUpdatesTitleBodyContentTypeAndTaskRelation() throws Exception {
        Task originalTask = saveTask("Original task");
        Task updatedTask = saveTask("Updated task");
        long noteId = createNote("Old title", "Old body", originalTask.getId());
        String payload = """
                {"title":"Updated title","body":"Updated body","contentType":"JSON","taskId":%d}
                """.formatted(updatedTask.getId());

        mockMvc.perform(put("/api/v1/notes/{id}", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) noteId))
                .andExpect(jsonPath("$.title").value("Updated title"))
                .andExpect(jsonPath("$.body").value("Updated body"))
                .andExpect(jsonPath("$.contentType").value("JSON"))
                .andExpect(jsonPath("$.taskId").value(updatedTask.getId().intValue()));
    }

    @Test
    void updateNoteLayoutUpdatesOnlyLayoutFields() throws Exception {
        Task task = saveTask("Layout task");
        long noteId = createNote("Layout title", "Layout body", task.getId());
        String payload = """
                {"displayOrder":7,"positionX":10,"positionY":20,"width":300,"height":180,"color":" #ffeeaa ","zIndex":3}
                """;

        mockMvc.perform(patch("/api/v1/notes/{id}/layout", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) noteId))
                .andExpect(jsonPath("$.title").value("Layout title"))
                .andExpect(jsonPath("$.body").value("Layout body"))
                .andExpect(jsonPath("$.taskId").value(task.getId().intValue()))
                .andExpect(jsonPath("$.displayOrder").value(7))
                .andExpect(jsonPath("$.positionX").value(10))
                .andExpect(jsonPath("$.positionY").value(20))
                .andExpect(jsonPath("$.width").value(300))
                .andExpect(jsonPath("$.height").value(180))
                .andExpect(jsonPath("$.color").value("#ffeeaa"))
                .andExpect(jsonPath("$.zIndex").value(3));
    }


    @Test
    void screenshotAttachmentDataFieldUsesBinaryJdbcMapping() throws Exception {
        java.lang.reflect.Field dataField = NoteAttachment.class.getDeclaredField("data");

        org.assertj.core.api.Assertions.assertThat(dataField.getType()).isEqualTo(byte[].class);
        org.assertj.core.api.Assertions.assertThat(dataField.isAnnotationPresent(jakarta.persistence.Lob.class)).isFalse();
        org.assertj.core.api.Assertions.assertThat(dataField.getAnnotation(jakarta.persistence.Column.class).columnDefinition()).isEqualTo("bytea");
        org.assertj.core.api.Assertions.assertThat(dataField.getAnnotation(org.hibernate.annotations.JdbcTypeCode.class).value())
                .isEqualTo(org.hibernate.type.SqlTypes.VARBINARY);
    }

    @Test
    void uploadScreenshotAddsAttachmentMetadataToNoteResponse() throws Exception {
        long noteId = createNote("Screenshot note", "Body", null);
        byte[] bytes = new byte[]{1, 2, 3};
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", bytes);

        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/tools/screenshot", noteId)
                        .file(file)
                        .param("caption", " Login failure ")
                        .param("source", "browser-extension")
                        .param("width", "1440")
                        .param("height", "900"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fileName").value("capture.png"))
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.sizeBytes").value(3))
                .andExpect(jsonPath("$.kind").value("SCREENSHOT"))
                .andExpect(jsonPath("$.caption").value("Login failure"))
                .andExpect(jsonPath("$.source").value("browser-extension"))
                .andExpect(jsonPath("$.width").value(1440))
                .andExpect(jsonPath("$.height").value(900))
                .andExpect(jsonPath("$.downloadUrl").value(org.hamcrest.Matchers.matchesPattern("http://localhost/api/v1/notes/" + noteId + "/screenshots/\\d+")))
                .andReturn().getResponse().getContentAsString();
        JsonNode uploadJson = objectMapper.readTree(uploadResponse);
        long attachmentId = uploadJson.get("id").asLong();
        String downloadUrl = uploadJson.get("downloadUrl").asText();

        NoteAttachment attachment = noteAttachmentRepository.findById(attachmentId).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(attachment.getData()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(attachment.getData()).containsExactly(bytes);
        org.assertj.core.api.Assertions.assertThat(attachment.getSizeBytes()).isEqualTo((long) bytes.length);
        org.assertj.core.api.Assertions.assertThat(attachment.getNote().getId()).isEqualTo(noteId);

        mockMvc.perform(get("/api/v1/notes/{id}", noteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments", hasSize(1)))
                .andExpect(jsonPath("$.attachments[0].fileName").value("capture.png"))
                .andExpect(jsonPath("$.attachments[0].contentType").value("image/png"))
                .andExpect(jsonPath("$.attachments[0].downloadUrl").value(downloadUrl))
                .andExpect(jsonPath("$.attachments[0].data").doesNotExist());
    }

    @Test
    void noteResponseDownloadUrlUsesRequestBackendOrigin() throws Exception {
        long noteId = createNote("Backend URL screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{4, 5, 6});
        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId)
                        .file(file)
                        .with(request -> {
                            request.setServerName("api.example.test");
                            request.setServerPort(8443);
                            return request;
                        }))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.downloadUrl").value(org.hamcrest.Matchers.matchesPattern("http://api.example.test:8443/api/v1/notes/" + noteId + "/screenshots/\\d+")))
                .andReturn().getResponse().getContentAsString();
        String uploadDownloadUrl = objectMapper.readTree(uploadResponse).get("downloadUrl").asText();

        mockMvc.perform(get("/api/v1/notes/{id}", noteId)
                        .with(request -> {
                            request.setServerName("api.example.test");
                            request.setServerPort(8443);
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments[0].downloadUrl").value(uploadDownloadUrl));
    }

    @Test
    void fetchScreenshotReturnsBinaryContent() throws Exception {
        long noteId = createNote("Fetch screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.webp", "image/webp", new byte[]{9, 8, 7});
        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(get("/api/v1/notes/{id}/screenshots/{attachmentId}", noteId, attachmentId))
                .andExpect(status().isOk())
                .andExpect(result -> org.assertj.core.api.Assertions.assertThat(result.getResponse().getContentAsByteArray()).containsExactly(9, 8, 7));
    }

    @Test
    void deleteScreenshotRemovesAttachmentMetadata() throws Exception {
        long noteId = createNote("Delete screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.jpg", "image/jpeg", new byte[]{1});
        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(delete("/api/v1/notes/{id}/screenshots/{attachmentId}", noteId, attachmentId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notes/{id}", noteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments", hasSize(0)));
    }


    @Test
    void uploadScreenshotRejectsOverlongFileName() throws Exception {
        long noteId = createNote("Overlong filename screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "a".repeat(256) + ".png", "image/png", new byte[]{1});

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Screenshot file name must not exceed 255 characters"));
    }

    @Test
    void uploadScreenshotRejectsOverlongCaption() throws Exception {
        long noteId = createNote("Overlong caption screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1});

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId)
                        .file(file)
                        .param("caption", "a".repeat(501)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Screenshot caption must not exceed 500 characters"));
    }

    @Test
    void uploadScreenshotRejectsOverlongSource() throws Exception {
        long noteId = createNote("Overlong source screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1});

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId)
                        .file(file)
                        .param("source", "a".repeat(101)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Screenshot source must not exceed 100 characters"));
    }

    @Test
    void uploadScreenshotRejectsInvalidContentType() throws Exception {
        long noteId = createNote("Invalid screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.gif", "image/gif", new byte[]{1});

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Screenshot content type must be one of: image/png, image/jpeg, image/webp"));
    }

    @Test
    void uploadScreenshotReturnsNotFoundForMissingNote() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1});

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", 999999L).file(file))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Note with id 999999 not found"));
    }

    @Test
    void deletingNoteCascadesScreenshotAttachments() throws Exception {
        long noteId = createNote("Cascade screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1});
        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/v1/notes/{id}", noteId))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions.assertThat(noteAttachmentRepository.count()).isZero();
    }

    @Test
    void uploadScreenshotRejectsOversizedFileWithControlledApiResponse() throws Exception {
        long noteId = createNote("Oversized screenshot", "Body", null);
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[17]);

        assertMultipartLimitsExceedBusinessScreenshotLimit();

        mockMvc.perform(multipart("/api/v1/notes/{id}/screenshots", noteId).file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Screenshot file size must not exceed 16 bytes"))
                .andExpect(jsonPath("$.path").value("/api/v1/notes/" + noteId + "/screenshots"));
    }

    @Test
    void deleteNoteRemovesTheNote() throws Exception {
        long noteId = createNote("Delete me", "Temporary body", null);

        mockMvc.perform(delete("/api/v1/notes/{id}", noteId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notes/{id}", noteId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Note with id " + noteId + " not found"));
    }

    private void assertMultipartLimitsExceedBusinessScreenshotLimit() {
        long businessLimit = environment.getRequiredProperty("app.notes.screenshots.max-file-size-bytes", Long.class);
        long multipartFileLimit = environment.getRequiredProperty("spring.servlet.multipart.max-file-size", DataSize.class).toBytes();
        long multipartRequestLimit = environment.getRequiredProperty("spring.servlet.multipart.max-request-size", DataSize.class).toBytes();

        org.assertj.core.api.Assertions.assertThat(multipartFileLimit).isGreaterThanOrEqualTo(businessLimit);
        org.assertj.core.api.Assertions.assertThat(multipartRequestLimit).isGreaterThanOrEqualTo(businessLimit);
    }

    private Task saveTask(String title) {
        return taskRepository.save(new Task(title));
    }

    private long createNote(String title, String body, Long taskId) throws Exception {
        return createNote(title, body, taskId, null);
    }

    private long createNote(String title, String body, Long taskId, String contentType, String... tags) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode()
                .put("title", title)
                .put("body", body);
        if (taskId != null) {
            payload.put("taskId", taskId);
        }
        if (contentType != null) {
            payload.put("contentType", contentType);
        }
        if (tags != null && tags.length > 0) {
            var tagsNode = payload.putArray("tags");
            for (String tag : tags) {
                tagsNode.add(tag);
            }
        }

        String response = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("id").asLong();
    }
}
