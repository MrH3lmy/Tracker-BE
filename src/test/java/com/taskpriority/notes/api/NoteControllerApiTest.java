package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.taskpriority.model.Task;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:notes-api-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class NoteControllerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private TaskRepository taskRepository;

    @BeforeEach
    void cleanDatabase() {
        noteRepository.deleteAll();
        taskRepository.deleteAll();
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
    void deleteNoteRemovesTheNote() throws Exception {
        long noteId = createNote("Delete me", "Temporary body", null);

        mockMvc.perform(delete("/api/v1/notes/{id}", noteId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notes/{id}", noteId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Note with id " + noteId + " not found"));
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
