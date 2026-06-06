package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.hamcrest.Matchers.hasSize;
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
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=true"
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
        String taskIdProperty = taskId == null ? "" : ",\"taskId\":" + taskId;
        String payload = """
                {"title":"%s","body":"%s"%s}
                """.formatted(title, body, taskIdProperty);

        String response = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("id").asLong();
    }
}
