package com.taskpriority.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.ActivityEntityType;
import com.taskpriority.model.ActivityEventType;
import com.taskpriority.model.Note;
import com.taskpriority.model.Project;
import com.taskpriority.model.ProjectActivity;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.ProjectActivityRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Coverage for issue #288 (GET /api/v1/projects/{id}/activity): persistence of the minimum event
 * set from this slice, explicit machine-readable event/entity types, newest-first ordering with a
 * deterministic same-timestamp tiebreak, cross-user authorization, and metadata shape.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class ProjectActivityIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired NoteRepository noteRepository;
    @Autowired ProjectActivityRepository activityRepository;
    @Autowired TaskService taskService;

    private User alice;
    private Long projectId;

    @BeforeEach
    void setUp() throws Exception {
        alice = TestAuthSupport.loginAsNewUser(userRepository);
        Project project = new Project("Platform");
        project.setUserId(alice.getId());
        projectId = projectRepository.save(project).getId();
    }

    // POST /api/v1/tasks has no projectId field (a project is assigned separately via
    // PATCH /{id}/project) - going through TaskService directly exercises the same TaskService.save()
    // that the controller calls, just with projectId already set the way NoteTaskConversionService
    // sets it when a task is created with a project from the start.
    private long createTask(String title) {
        Task task = new Task(title);
        task.setStatus(Status.NOT_STARTED);
        task.setProjectId(projectId);
        return taskService.save(task).getId();
    }

    @Test
    void taskCreationEmitsActivity() throws Exception {
        createTask("Design API");

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("TASK_CREATED"))
                .andExpect(jsonPath("$[0].entityType").value("TASK"))
                .andExpect(jsonPath("$[0].projectId").value(projectId.intValue()))
                .andExpect(jsonPath("$[0].entityId").isNumber());
    }

    @Test
    void taskCompletionEmitsActivityWithExplicitMetadata() throws Exception {
        long taskId = createTask("Ship it");

        mockMvc.perform(patch("/api/v1/tasks/{id}/complete", taskId)).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("TASK_COMPLETED"))
                .andExpect(jsonPath("$[0].metadata.fromStatus").value("NOT_STARTED"))
                .andExpect(jsonPath("$[0].metadata.toStatus").value("DONE"));
    }

    @Test
    void noteCreationEmitsActivity() throws Exception {
        String body = """
                {"title":"Kickoff notes","body":"Agenda","projectId":%d}
                """.formatted(projectId);

        mockMvc.perform(post("/api/v1/notes").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("NOTE_CREATED"))
                .andExpect(jsonPath("$[0].entityType").value("NOTE"));
    }

    @Test
    void meetingActionToTaskProducesBothNoteTaskCreatedAndTaskCreatedActivity() throws Exception {
        Note note = new Note("Standup");
        note.setUserId(alice.getId());
        note.setBody("Notes");
        note.setProjectId(projectId);
        Note savedNote = noteRepository.save(note);

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", savedNote.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Confirm API contract\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].eventType", org.hamcrest.Matchers.containsInAnyOrder("TASK_CREATED", "NOTE_TASK_CREATED")));
    }

    @Test
    void activityIsOrderedNewestFirst() throws Exception {
        long first = createTask("First");
        long second = createTask("Second");
        long third = createTask("Third");

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].entityId").value(third))
                .andExpect(jsonPath("$[1].entityId").value(second))
                .andExpect(jsonPath("$[2].entityId").value(first));
    }

    @Test
    void sameTimestampPaginationIsDeterministicViaIdTiebreak() throws Exception {
        LocalDateTime sharedInstant = LocalDateTime.now().minusHours(1);
        Long id1 = saveActivityAt(sharedInstant, "First event");
        Long id2 = saveActivityAt(sharedInstant, "Second event");
        Long id3 = saveActivityAt(sharedInstant, "Third event");

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId).param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id3))
                .andExpect(jsonPath("$[1].id").value(id2));

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId).param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id1));
    }

    private Long saveActivityAt(LocalDateTime occurredAt, String summary) {
        ProjectActivity activity = new ProjectActivity();
        activity.setUserId(alice.getId());
        activity.setProjectId(projectId);
        activity.setActorUserId(alice.getId());
        activity.setEventType(ActivityEventType.PROJECT_UPDATED);
        activity.setEntityType(ActivityEntityType.PROJECT);
        activity.setEntityId(projectId);
        activity.setSummary(summary);
        activity.setOccurredAt(occurredAt);
        return activityRepository.save(activity).getId();
    }

    @Test
    void anotherUsersProjectActivityIsInaccessible() throws Exception {
        TestAuthSupport.loginAsNewUser(userRepository); // switch to Bob

        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isNotFound());
    }

    @Test
    void emptyActivityForANewProject() throws Exception {
        mockMvc.perform(get("/api/v1/projects/{id}/activity", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
