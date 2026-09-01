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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Real-Postgres concurrency coverage for issue #282's cycle-prevention invariant. Dependency
 * writes serialize on the owning project row (or user row for project-less tasks) before the
 * recursive cycle check and insert. The disjoint-endpoint test is the important regression case:
 * endpoint-only locks cannot protect a cycle completed by two writes that share no endpoint.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class TaskDependencyCycleConcurrencyPostgresTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("taskpriority")
            .withUsername("taskpriority")
            .withPassword("taskpriority");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private TaskDependencyRepository taskDependencyRepository;

    private Task saveTask(Long userId, String title) {
        return saveTask(userId, title, null);
    }

    private Task saveTask(Long userId, String title, Long projectId) {
        Task task = new Task(title);
        task.setUserId(userId);
        task.setStatus(Status.NOT_STARTED);
        task.setPosition(1000);
        task.setProjectId(projectId);
        return taskRepository.save(task);
    }

    private Long saveProject(Long userId, String name) {
        Project project = new Project(name);
        project.setUserId(userId);
        project.setOwnerUserId(userId);
        return projectRepository.save(project).getId();
    }

    private MvcResult postDependency(Authentication authentication, Long taskId, Long blocksTaskId) throws Exception {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String body = "{\"blocksTaskId\":" + blocksTaskId + "}";
        return mockMvc.perform(post("/api/v1/tasks/{id}/dependencies", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    @Test
    void concurrentOppositeEdgesNeverBothSucceed() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Task a = saveTask(alice.getId(), "A");
        Task b = saveTask(alice.getId(), "B");

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Callable<MvcResult> createAToB = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, a.getId(), b.getId());
            };
            Callable<MvcResult> createBToA = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, b.getId(), a.getId());
            };

            Future<MvcResult> f1 = executor.submit(createAToB);
            Future<MvcResult> f2 = executor.submit(createBToA);

            assertThat(ready.await(10, TimeUnit.SECONDS)).as("both workers reached the starting line").isTrue();
            go.countDown();

            MvcResult r1 = f1.get(30, TimeUnit.SECONDS);
            MvcResult r2 = f2.get(30, TimeUnit.SECONDS);

            List<Integer> statuses = List.of(r1.getResponse().getStatus(), r2.getResponse().getStatus());
            assertThat(statuses).as("exactly one of the two opposite-direction requests succeeds")
                    .containsExactlyInAnyOrder(200, 400);

            long edgeCount = taskDependencyRepository.findByUserId(alice.getId()).size();
            assertThat(edgeCount).as("at most one of the conflicting edges persists").isEqualTo(1);

            boolean aToB = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), a.getId(), b.getId());
            boolean bToA = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), b.getId(), a.getId());
            assertThat(aToB ^ bToA).as("the persisted graph has exactly one direction, never both (never cyclic)").isTrue();
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void concurrentTransitiveCycleNeverPersists() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Task a = saveTask(alice.getId(), "A");
        Task b = saveTask(alice.getId(), "B");
        Task c = saveTask(alice.getId(), "C");

        assertThat(postDependency(authentication, b.getId(), c.getId()).getResponse().getStatus()).isEqualTo(200);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Callable<MvcResult> createAToB = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, a.getId(), b.getId());
            };
            Callable<MvcResult> createCToA = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, c.getId(), a.getId());
            };

            Future<MvcResult> f1 = executor.submit(createAToB);
            Future<MvcResult> f2 = executor.submit(createCToA);

            assertThat(ready.await(10, TimeUnit.SECONDS)).as("both workers reached the starting line").isTrue();
            go.countDown();

            MvcResult r1 = f1.get(30, TimeUnit.SECONDS);
            MvcResult r2 = f2.get(30, TimeUnit.SECONDS);

            List<Integer> statuses = new ArrayList<>(List.of(r1.getResponse().getStatus(), r2.getResponse().getStatus()));
            assertThat(statuses).allMatch(status -> status == 200 || status == 400);

            boolean aToB = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), a.getId(), b.getId());
            boolean cToA = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), c.getId(), a.getId());
            assertThat(aToB && cToA).as("A->B, B->C and C->A never all persist together (never cyclic)").isFalse();
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void concurrentDisjointEndpointEdgesCannotJointlyCloseLongerCycle() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long projectId = saveProject(alice.getId(), "Concurrent DAG");

        Task a = saveTask(alice.getId(), "A", projectId);
        Task b = saveTask(alice.getId(), "B", projectId);
        Task c = saveTask(alice.getId(), "C", projectId);
        Task d = saveTask(alice.getId(), "D", projectId);

        assertThat(postDependency(authentication, b.getId(), c.getId()).getResponse().getStatus()).isEqualTo(200);
        assertThat(postDependency(authentication, d.getId(), a.getId()).getResponse().getStatus()).isEqualTo(200);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Callable<MvcResult> createAToB = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, a.getId(), b.getId());
            };
            Callable<MvcResult> createCToD = () -> {
                ready.countDown();
                go.await();
                return postDependency(authentication, c.getId(), d.getId());
            };

            Future<MvcResult> f1 = executor.submit(createAToB);
            Future<MvcResult> f2 = executor.submit(createCToD);

            assertThat(ready.await(10, TimeUnit.SECONDS)).as("both disjoint-endpoint workers reached the starting line").isTrue();
            go.countDown();

            MvcResult r1 = f1.get(30, TimeUnit.SECONDS);
            MvcResult r2 = f2.get(30, TimeUnit.SECONDS);

            List<Integer> statuses = List.of(r1.getResponse().getStatus(), r2.getResponse().getStatus());
            assertThat(statuses).as("graph-scope serialization allows one edge and rejects the cycle-closing edge")
                    .containsExactlyInAnyOrder(200, 400);

            boolean aToB = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), a.getId(), b.getId());
            boolean cToD = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), c.getId(), d.getId());
            assertThat(aToB && cToD)
                    .as("A->B, B->C, C->D and D->A must never all persist")
                    .isFalse();
            assertThat(taskDependencyRepository.findByUserId(alice.getId()))
                    .as("two pre-existing edges plus exactly one concurrent edge")
                    .hasSize(3);
        } finally {
            executor.shutdownNow();
        }
    }
}
