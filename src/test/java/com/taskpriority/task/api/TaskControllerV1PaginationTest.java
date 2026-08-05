package com.taskpriority.task.api;

import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for GitHub issue #260: GET /api/v1/tasks and /api/v1/tasks/archive must
 * page and filter in PostgreSQL (H2 here, same query path) rather than loading a user's entire
 * task history, enforce a server-side max page size, sort deterministically, and never leak
 * another user's rows through pagination.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class TaskControllerV1PaginationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ProjectRepository projectRepository;

    private User alice;

    @BeforeEach
    void seedAlicesTasks() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);

        Project project = new Project("Alice's project");
        project.setUserId(alice.getId());
        Long projectId = projectRepository.save(project).getId();

        for (int i = 0; i < 7; i++) {
            Task task = new Task("Active task " + i);
            task.setUserId(alice.getId());
            task.setStatus(Status.NOT_STARTED);
            task.setPosition((i + 1) * 1000);
            if (i < 2) {
                task.setProjectId(projectId);
            }
            taskRepository.save(task);
        }
        for (int i = 0; i < 3; i++) {
            Task task = new Task("Done task " + i);
            task.setUserId(alice.getId());
            task.setStatus(Status.DONE);
            task.setPosition((i + 100) * 1000);
            taskRepository.save(task);
        }

        // An unrelated user's tasks must never surface in Alice's pages/counts/filters. Persisted
        // directly (not via TestAuthSupport.loginAsNewUser) so the security context - and every
        // mockMvc.perform() below - stays authenticated as Alice.
        User bob = new User();
        bob.setEmail("bob-" + System.nanoTime() + "@example.com");
        bob.setPasswordHash("irrelevant-for-this-test");
        bob.setTier(com.taskpriority.model.Tier.PREMIUM);
        bob.setRole(com.taskpriority.model.Role.USER);
        bob = userRepository.save(bob);
        Task bobTask = new Task("Bob's task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        taskRepository.save(bobTask);
    }

    @Test
    void defaultPageReturnsAllOfAlicesTasksWithHeaderMetadata() throws Exception {
        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "10"))
                .andExpect(header().string("X-Page", "0"))
                .andExpect(header().string("X-Has-Next", "false"))
                .andExpect(jsonPath("$.length()").value(10));
    }

    @Test
    void pageSizeIsCappedAtServerMaximumEvenWhenALargerSizeIsRequested() throws Exception {
        mockMvc.perform(get("/api/v1/tasks").param("size", "999999"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Page-Size", String.valueOf(TaskControllerV1.MAX_PAGE_SIZE)));
    }

    @Test
    void statusFilterExecutesInTheDatabase() throws Exception {
        mockMvc.perform(get("/api/v1/tasks").param("status", "DONE"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].status").value("DONE"));
    }

    @Test
    void archiveEndpointOnlyReturnsDoneAndCancelledTasks() throws Exception {
        mockMvc.perform(get("/api/v1/tasks/archive"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void projectFilterExecutesInTheDatabase() throws Exception {
        Long projectId = projectRepository.findAll().stream()
                .filter(p -> p.getUserId().equals(alice.getId()))
                .findFirst().orElseThrow().getId();

        mockMvc.perform(get("/api/v1/tasks").param("projectId", String.valueOf(projectId)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "2"));
    }

    @Test
    void pagesAreDeterministicallyOrderedWithNoOverlapOrGaps() throws Exception {
        Set<Integer> seenIds = new HashSet<>();
        for (int page = 0; page < 5; page++) {
            MvcResult result = mockMvc.perform(get("/api/v1/tasks").param("page", String.valueOf(page)).param("size", "2"))
                    .andExpect(status().isOk())
                    .andReturn();
            List<Integer> ids = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$[*].id");
            ids.forEach(id -> assertThat(seenIds.add(id)).as("id %d must not repeat across pages", id).isTrue());
        }
        assertThat(seenIds).hasSize(10);
    }
}
