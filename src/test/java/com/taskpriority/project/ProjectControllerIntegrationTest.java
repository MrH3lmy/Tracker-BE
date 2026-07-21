package com.taskpriority.project;

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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for ProjectController against H2, exercising the actual
 * ProjectService/ProjectRepository/MilestoneRepository stack, unlike ProjectControllerTest which
 * mocks the service.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class ProjectControllerIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long createProject(String name) throws Exception {
        String body = """
                {"name":"%s","status":"ACTIVE","startDate":"2026-01-01","targetDate":"2026-06-01","area":"WORK","goal":"Ship it"}
                """.formatted(name);
        String response = mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    private long createTask(String title) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }

    @Test
    void createThenGetByIdAndGetAllRoundTripsRealData() throws Exception {
        long id = createProject("Website relaunch");

        mockMvc.perform(get("/api/v1/projects/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) id))
                .andExpect(jsonPath("$.name").value("Website relaunch"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.startDate").value("2026-01-01"))
                .andExpect(jsonPath("$.targetDate").value("2026-06-01"))
                .andExpect(jsonPath("$.ownerUserId").exists());

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) id)));
    }

    @Test
    void updateChangesPersistedFields() throws Exception {
        long id = createProject("Website relaunch");

        mockMvc.perform(put("/api/v1/projects/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Website relaunch v2","status":"ON_HOLD"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Website relaunch v2"))
                .andExpect(jsonPath("$.status").value("ON_HOLD"));

        mockMvc.perform(get("/api/v1/projects/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Website relaunch v2"));
    }

    @Test
    void deleteRemovesProjectButTaskSurvivesWithProjectUnset() throws Exception {
        long projectId = createProject("Website relaunch");
        long taskId = createTask("Design homepage");
        mockMvc.perform(patch("/api/v1/tasks/{id}/project", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"projectId\":" + projectId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value((int) projectId));

        mockMvc.perform(delete("/api/v1/projects/{id}", projectId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/projects/{id}", projectId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/tasks/{id}", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Design homepage"));
    }

    @Test
    void tasksAndOverviewReflectLinkedTasks() throws Exception {
        long projectId = createProject("Website relaunch");
        long taskId = createTask("Design homepage");
        mockMvc.perform(patch("/api/v1/tasks/{id}/project", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"projectId\":" + projectId + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/projects/{id}/tasks", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Design homepage"));

        mockMvc.perform(get("/api/v1/projects/{id}/overview", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(1))
                .andExpect(jsonPath("$.completedTasks").value(0))
                .andExpect(jsonPath("$.activeTasks").value(1))
                .andExpect(jsonPath("$.project.name").value("Website relaunch"))
                .andExpect(jsonPath("$.riskLevel").exists());
    }

    @Test
    void milestoneCrudRoundTripsRealData() throws Exception {
        long projectId = createProject("Website relaunch");

        String createResponse = mockMvc.perform(post("/api/v1/projects/{id}/milestones", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Design done\",\"targetDate\":\"2026-02-01\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectId").value((int) projectId))
                .andExpect(jsonPath("$.title").value("Design done"))
                .andReturn().getResponse().getContentAsString();
        long milestoneId = jsonMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/v1/projects/{id}/milestones", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value((int) milestoneId));

        mockMvc.perform(put("/api/v1/projects/{id}/milestones/{milestoneId}", projectId, milestoneId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Design done\",\"targetDate\":\"2026-02-01\",\"status\":\"DONE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mockMvc.perform(delete("/api/v1/projects/{id}/milestones/{milestoneId}", projectId, milestoneId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/projects/{id}/milestones", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void createReturnsBadRequestWithApiErrorShapeWhenNameMissing() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/projects"));
    }

    @Test
    void createReturnsBadRequestWhenTargetDateBeforeStartDate() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bad dates\",\"startDate\":\"2026-06-01\",\"targetDate\":\"2026-01-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("targetDate must be on or after startDate")));
    }

    @Test
    void getByIdReturnsNotFoundForMissingProject() throws Exception {
        mockMvc.perform(get("/api/v1/projects/{id}", 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void deleteReturnsNotFoundForMissingProject() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/{id}", 987654321L))
                .andExpect(status().isNotFound());
    }

    @Test
    void projectsAreIsolatedPerUser() throws Exception {
        long projectId = createProject("Private project");

        TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(get("/api/v1/projects/{id}", projectId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(put("/api/v1/projects/{id}", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hijacked\"}"))
                .andExpect(status().isNotFound());
    }
}
