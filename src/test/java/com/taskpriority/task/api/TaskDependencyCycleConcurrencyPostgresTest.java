package com.taskpriority.task.api;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
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
 * Real concurrency coverage for issue #282's cycle-prevention requirement: two genuinely
 * simultaneous requests that each independently look safe against the pre-race graph (A depends
 * on B, B depends on A; or a longer transitive loop) must never both succeed - the dependency
 * graph must stay acyclic even when neither request could see the other's write coming. This
 * needs real Postgres (Testcontainers, Flyway migrations applied) because the invariant under
 * test is the {@code SELECT ... FOR UPDATE} row-lock serialization in
 * {@code TaskService#addDependency} plus the {@code uk_task_dependencies_pair} unique constraint -
 * H2's locking semantics don't reliably exercise the same contention path.
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
    @Autowired private TaskRepository taskRepository;
    @Autowired private TaskDependencyRepository taskDependencyRepository;

    private Task saveTask(Long userId, String title) {
        Task task = new Task(title);
        task.setUserId(userId);
        task.setStatus(Status.NOT_STARTED);
        task.setPosition(1000);
        return taskRepository.save(task);
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

        // Pre-existing edge B -> C (B depends on C), committed before the race starts.
        assertThat(postDependency(authentication, b.getId(), c.getId()).getResponse().getStatus()).isEqualTo(200);

        // Concurrently: A -> B, and C -> A. Neither, checked alone against {B->C}, looks cyclic;
        // together with B->C they would close A->B->C->A.
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
            // Both requests may legitimately succeed only if they don't end up forming a cycle
            // together - assert on the actual invariant (acyclic graph) rather than which
            // specific requests won, since either interleaving is a valid, safe outcome.
            assertThat(statuses).allMatch(status -> status == 200 || status == 400);

            boolean aToB = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), a.getId(), b.getId());
            boolean cToA = taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(alice.getId(), c.getId(), a.getId());
            // The graph must never end up containing all three edges A->B, B->C, C->A at once -
            // that would be a live 3-cycle.
            assertThat(aToB && cToA).as("A->B, B->C and C->A never all persist together (never cyclic)").isFalse();
        } finally {
            executor.shutdownNow();
        }
    }
}
