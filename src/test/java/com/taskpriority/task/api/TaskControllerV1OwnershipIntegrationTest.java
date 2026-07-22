package com.taskpriority.task.api;

import com.taskpriority.model.Board;
import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for GitHub issue #221: every ID-based task operation must be scoped to the
 * authenticated user. Alice seeds a task (plus a project and board column of her own); Bob then
 * tries to read/mutate Alice's resources by ID and must always get a 404, with the underlying
 * data left untouched.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class TaskControllerV1OwnershipIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired TaskDependencyRepository taskDependencyRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired BoardColumnRepository boardColumnRepository;

    @PersistenceContext
    EntityManager entityManager;

    private User alice;
    private User bob;
    private Long aliceTaskId;
    private Long aliceProjectId;
    private Long aliceColumnId;

    @BeforeEach
    void seedAlicesData() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);

        Task task = new Task("Alice's private task");
        task.setUserId(alice.getId());
        task.setStatus(Status.NOT_STARTED);
        task.setPosition(1000);
        aliceTaskId = taskRepository.save(task).getId();

        Project project = new Project("Alice's project");
        project.setUserId(alice.getId());
        aliceProjectId = projectRepository.save(project).getId();

        Board board = new Board();
        board.setUserId(alice.getId());
        board.setName("Alice's Board");
        entityManager.persist(board);

        BoardColumn column = new BoardColumn();
        column.setUserId(alice.getId());
        column.setBoard(board);
        column.setName("Alice's Column");
        column.setStatus(Status.IN_PROGRESS);
        column.setPosition(1000);
        aliceColumnId = boardColumnRepository.save(column).getId();

        // Switch the security context to a second, unrelated user for the rest of each test.
        bob = TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void getByIdReturns404ForAnotherUsersTask() throws Exception {
        mockMvc.perform(get("/api/v1/tasks/{id}", aliceTaskId)).andExpect(status().isNotFound());
    }

    @Test
    void detailReturns404ForAnotherUsersTask() throws Exception {
        mockMvc.perform(get("/api/v1/tasks/{id}/detail", aliceTaskId)).andExpect(status().isNotFound());
    }

    @Test
    void updateReturns404AndLeavesTaskUnchanged() throws Exception {
        String body = """
                {"title":"Hijacked title","status":"NOT_STARTED"}
                """;
        mockMvc.perform(put("/api/v1/tasks/{id}", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());

        assertEquals("Alice's private task", taskRepository.findById(aliceTaskId).orElseThrow().getTitle());
    }

    @Test
    void deleteReturns404AndTaskStillExists() throws Exception {
        mockMvc.perform(delete("/api/v1/tasks/{id}", aliceTaskId)).andExpect(status().isNotFound());

        assertTrue(taskRepository.findById(aliceTaskId).isPresent());
    }

    @Test
    void completeReturns404AndTaskStaysNotDone() throws Exception {
        mockMvc.perform(patch("/api/v1/tasks/{id}/complete", aliceTaskId)).andExpect(status().isNotFound());

        assertEquals(Status.NOT_STARTED, taskRepository.findById(aliceTaskId).orElseThrow().getStatus());
    }

    @Test
    void statusChangeReturns404() throws Exception {
        mockMvc.perform(patch("/api/v1/tasks/{id}/status", aliceTaskId).param("status", "DONE"))
                .andExpect(status().isNotFound());

        assertEquals(Status.NOT_STARTED, taskRepository.findById(aliceTaskId).orElseThrow().getStatus());
    }

    @Test
    void moveIntoAnotherUsersBoardColumnReturns404() throws Exception {
        String body = """
                {"status":"IN_PROGRESS","boardColumnId":%d,"position":0}
                """.formatted(aliceColumnId);
        mockMvc.perform(patch("/api/v1/tasks/{id}/move", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void subtasksListReturns404ForAnotherUsersParentTask() throws Exception {
        mockMvc.perform(get("/api/v1/tasks/{id}/subtasks", aliceTaskId)).andExpect(status().isNotFound());
    }

    @Test
    void createSubtaskUnderAnotherUsersTaskReturns404() throws Exception {
        String body = """
                {"title":"Bob's sneaky subtask","status":"NOT_STARTED"}
                """;
        mockMvc.perform(post("/api/v1/tasks/{id}/subtasks", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());

        assertTrue(taskRepository.findByUserIdAndParentTaskIdOrderByPositionAscIdAsc(alice.getId(), aliceTaskId).isEmpty());
    }

    @Test
    void reparentingOwnTaskUnderAnotherUsersTaskReturns404() throws Exception {
        Task bobTask = new Task("Bob's own task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        Long bobTaskId = taskRepository.save(bobTask).getId();

        String body = """
                {"parentTaskId":%d}
                """.formatted(aliceTaskId);
        mockMvc.perform(patch("/api/v1/tasks/{id}/parent", bobTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateParentOnAnotherUsersTaskReturns404() throws Exception {
        String body = "{\"parentTaskId\":null}";
        mockMvc.perform(patch("/api/v1/tasks/{id}/parent", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void assigningOwnTaskToAnotherUsersProjectReturns404() throws Exception {
        Task bobTask = new Task("Bob's own task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        Long bobTaskId = taskRepository.save(bobTask).getId();

        String body = """
                {"projectId":%d}
                """.formatted(aliceProjectId);
        mockMvc.perform(patch("/api/v1/tasks/{id}/project", bobTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());

        assertEquals(null, taskRepository.findById(bobTaskId).orElseThrow().getProjectId());
    }

    @Test
    void updateProjectOnAnotherUsersTaskReturns404() throws Exception {
        String body = "{\"projectId\":null}";
        mockMvc.perform(patch("/api/v1/tasks/{id}/project", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateDueDateOnAnotherUsersTaskReturns404() throws Exception {
        String body = """
                {"dueDate":"2026-08-01"}
                """;
        mockMvc.perform(patch("/api/v1/tasks/{id}/due-date", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void addDependencyInvolvingAnotherUsersTaskReturns404() throws Exception {
        Task bobTask = new Task("Bob's own task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        Long bobTaskId = taskRepository.save(bobTask).getId();

        String body = """
                {"blocksTaskId":%d}
                """.formatted(aliceTaskId);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", bobTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());

        assertTrue(taskDependencyRepository.findByUserIdAndTaskId(bob.getId(), bobTaskId).isEmpty());
    }

    @Test
    void addDependencyOnAnotherUsersTaskReturns404() throws Exception {
        Task bobTask = new Task("Bob's own task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        Long bobTaskId = taskRepository.save(bobTask).getId();

        String body = """
                {"blocksTaskId":%d}
                """.formatted(bobTaskId);
        mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeDependencyOnAnotherUsersTaskReturns404() throws Exception {
        mockMvc.perform(delete("/api/v1/tasks/{id}/dependencies/{blocksTaskId}", aliceTaskId, 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void scheduleTaskForAnotherUsersTaskReturns404() throws Exception {
        String body = """
                {"scheduledDate":"2026-08-01","startTime":"09:00:00","durationMinutes":30}
                """;
        mockMvc.perform(put("/api/v1/scheduler/tasks/{taskId}", aliceTaskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }
}
