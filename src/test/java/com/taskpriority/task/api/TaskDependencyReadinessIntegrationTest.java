package com.taskpriority.task.api;

import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
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
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Coverage for issue #282: the single authoritative blocked/ready definition
 * ({@code TaskReadinessService}), the "why is this task blocked?" blocker detail exposure on
 * {@code TaskResponse}, and dependency-write integrity (self/duplicate/cross-project/cycle
 * rejection). Real Spring context + H2 (not mocks) so the whole controller -> service ->
 * repository -> readiness-service path is exercised the same way a client would hit it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class TaskDependencyReadinessIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskDependencyRepository taskDependencyRepository;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);
    }

    private Task saveTask(String title, Status status, Long projectId) {
        Task task = new Task(title);
        task.setUserId(alice.getId());
        task.setStatus(status);
        task.setPosition(1000);
        task.setProjectId(projectId);
        return taskRepository.save(task);
    }

    private Long saveProject(String name) {
        Project project = new Project(name);
        project.setUserId(alice.getId());
        return projectRepository.save(project).getId();
    }

    private String dependencyBody(Long blocksTaskId) {
        return "{\"blocksTaskId\":" + blocksTaskId + "}";
    }

    // ---- Readiness rules ----------------------------------------------------------------

    @Test
    void taskWithNoDependenciesIsReadyWhenOtherwiseActionable() throws Exception {
        Task task = saveTask("Standalone", Status.NOT_STARTED, null);

        mockMvc.perform(get("/api/v1/tasks/{id}", task.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.blockers.length()").value(0));
    }

    @Test
    void oneIncompletePrerequisiteBlocksTheTask() throws Exception {
        Task blocker = saveTask("Blocker", Status.IN_PROGRESS, null);
        Task task = saveTask("Dependent", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(blocker.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true))
                .andExpect(jsonPath("$.ready").value(false))
                .andExpect(jsonPath("$.blockers.length()").value(1))
                .andExpect(jsonPath("$.blockers[0].id").value(blocker.getId()))
                .andExpect(jsonPath("$.blockers[0].title").value("Blocker"))
                .andExpect(jsonPath("$.blockers[0].status").value("IN_PROGRESS"));
    }

    @Test
    void multiplePrerequisitesWithOneIncompleteStillBlocks() throws Exception {
        Task done = saveTask("Done prerequisite", Status.DONE, null);
        Task inProgress = saveTask("Open prerequisite", Status.IN_PROGRESS, null);
        Task task = saveTask("Dependent", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(done.getId())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(inProgress.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true))
                .andExpect(jsonPath("$.ready").value(false))
                // only the unfinished prerequisite is reported as a blocker
                .andExpect(jsonPath("$.blockers.length()").value(1))
                .andExpect(jsonPath("$.blockers[0].id").value(inProgress.getId()));
    }

    @Test
    void readyWhenAllPrerequisitesComplete() throws Exception {
        Task a = saveTask("A", Status.DONE, null);
        Task b = saveTask("B", Status.CANCELLED, null);
        Task task = saveTask("C", Status.NOT_STARTED, null);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(a.getId())));
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(b.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.blockers.length()").value(0));
    }

    @Test
    void completedTaskIsNeverReadyEvenWithNoOpenDependencies() throws Exception {
        Task task = saveTask("Already done", Status.DONE, null);

        mockMvc.perform(get("/api/v1/tasks/{id}", task.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(false));
    }

    @Test
    void cancelledTaskIsNeverReady() throws Exception {
        Task task = saveTask("Abandoned", Status.CANCELLED, null);

        mockMvc.perform(get("/api/v1/tasks/{id}", task.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(false));
    }

    @Test
    void deletingLastIncompleteDependencyMakesTaskReady() throws Exception {
        Task blocker = saveTask("Blocker", Status.NOT_STARTED, null);
        Task task = saveTask("Dependent", Status.NOT_STARTED, null);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(blocker.getId())))
                .andExpect(jsonPath("$.blocked").value(true));

        mockMvc.perform(delete("/api/v1/tasks/{id}/dependencies/{blocksTaskId}", task.getId(), blocker.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(true));
    }

    @Test
    void completingLastIncompletePrerequisiteMakesTaskReady() throws Exception {
        Task blocker = saveTask("Blocker", Status.NOT_STARTED, null);
        Task task = saveTask("Dependent", Status.NOT_STARTED, null);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(blocker.getId())))
                .andExpect(jsonPath("$.blocked").value(true));

        mockMvc.perform(patch("/api/v1/tasks/{id}/complete", blocker.getId()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/tasks/{id}", task.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false))
                .andExpect(jsonPath("$.ready").value(true));
    }

    // ---- Validation -----------------------------------------------------------------------

    @Test
    void selfDependencyRejected() throws Exception {
        Task task = saveTask("Solo", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(task.getId())))
                .andExpect(status().isBadRequest());
        assertTrue(taskDependencyRepository.findByUserIdAndTaskId(alice.getId(), task.getId()).isEmpty());
    }

    @Test
    void duplicateDependencyIsIdempotentNotAnError() throws Exception {
        Task blocker = saveTask("Blocker", Status.NOT_STARTED, null);
        Task task = saveTask("Dependent", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(blocker.getId())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", task.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(blocker.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true));

        assertEquals(1, taskDependencyRepository.findByUserIdAndTaskId(alice.getId(), task.getId()).size());
    }

    @Test
    void crossProjectDependencyRejected() throws Exception {
        Long projectA = saveProject("Project A");
        Long projectB = saveProject("Project B");
        Task inA = saveTask("In A", Status.NOT_STARTED, projectA);
        Task inB = saveTask("In B", Status.NOT_STARTED, projectB);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", inA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(inB.getId())))
                .andExpect(status().isBadRequest());
        assertTrue(taskDependencyRepository.findByUserIdAndTaskId(alice.getId(), inA.getId()).isEmpty());
    }

    @Test
    void projectTaskDependingOnNoProjectTaskRejected() throws Exception {
        Long projectA = saveProject("Project A");
        Task inA = saveTask("In A", Status.NOT_STARTED, projectA);
        Task noProject = saveTask("No project", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", inA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(noProject.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void bothNoProjectDependencyAllowed() throws Exception {
        Task a = saveTask("A", Status.NOT_STARTED, null);
        Task b = saveTask("B", Status.NOT_STARTED, null);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", a.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(b.getId())))
                .andExpect(status().isOk());
    }

    @Test
    void sameProjectDependencyAllowed() throws Exception {
        Long projectA = saveProject("Project A");
        Task a = saveTask("A", Status.NOT_STARTED, projectA);
        Task b = saveTask("B", Status.NOT_STARTED, projectA);

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", a.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dependencyBody(b.getId())))
                .andExpect(status().isOk());
    }

    // ---- Cycle prevention -------------------------------------------------------------------

    @Test
    void directCycleRejected() throws Exception {
        Task a = saveTask("A", Status.NOT_STARTED, null);
        Task b = saveTask("B", Status.NOT_STARTED, null);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", a.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(b.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", b.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(a.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void transitiveCycleRejected() throws Exception {
        Task a = saveTask("A", Status.NOT_STARTED, null);
        Task b = saveTask("B", Status.NOT_STARTED, null);
        Task c = saveTask("C", Status.NOT_STARTED, null);
        // A depends on B, B depends on C
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", a.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(b.getId())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", b.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(c.getId())))
                .andExpect(status().isOk());

        // C depends on A would close the loop A->B->C->A
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", c.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(a.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deeperCycleRejected() throws Exception {
        Task a = saveTask("A", Status.NOT_STARTED, null);
        Task b = saveTask("B", Status.NOT_STARTED, null);
        Task c = saveTask("C", Status.NOT_STARTED, null);
        Task d = saveTask("D", Status.NOT_STARTED, null);
        Task e = saveTask("E", Status.NOT_STARTED, null);
        // A->B->C->D->E
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", a.getId())
                .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(b.getId())));
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", b.getId())
                .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(c.getId())));
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", c.getId())
                .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(d.getId())));
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", d.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(e.getId())))
                .andExpect(status().isOk());

        // E depends on A would close a 5-node loop
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", e.getId())
                        .contentType(MediaType.APPLICATION_JSON).content(dependencyBody(a.getId())))
                .andExpect(status().isBadRequest());
    }
}
