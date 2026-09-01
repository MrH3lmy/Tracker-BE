package com.taskpriority.notes;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.User;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Real concurrency coverage for issue #287's meeting-action idempotency requirement: two
 * genuinely simultaneous requests converting the same (note, block) action item must resolve to
 * one canonical task/link, never leak a 4xx/5xx from the underlying race, and never durably create
 * a second task or link. This needs real Postgres (Testcontainers, Flyway migrations applied) -
 * the local-test H2 profile has no Flyway run at all, so V53's partial unique index (the actual
 * invariant under test) doesn't exist there; asserting against H2 would only prove the
 * lock/check/create code path runs, not that it's backed by a real DB constraint.
 *
 * <p>The Hikari pool is deliberately sized smaller than {@link #CONCURRENCY}: each in-flight
 * conversion now needs at most one DB connection for its entire duration (a row lock on the
 * target block, held for the same transaction that creates the task/link - see
 * {@code NoteTaskConversionService.convertActionItem}), so callers beyond the pool size simply
 * queue for a connection and all still complete well within HikariCP's default 30s
 * connection-acquisition timeout. An earlier implementation that used a REQUIRES_NEW nested
 * transaction for the write needed up to two connections per in-flight request; at this pool
 * size that combination would deadlock (every connection consumed by outer transactions, none
 * left for any inner one) rather than merely queue - this test's ratio is chosen specifically to
 * fail loudly under that older shape rather than pass by coincidence.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class NoteTaskConversionConcurrencyPostgresTest {

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
        // Deliberately below CONCURRENCY - see the class Javadoc for why this ratio matters.
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "3");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private NoteBlockRepository noteBlockRepository;
    @Autowired private NoteTaskLinkRepository noteTaskLinkRepository;
    @Autowired private TaskRepository taskRepository;

    // More callers than pooled connections (maximum-pool-size=3 above) - proves the fix serializes
    // via a DB row lock instead of needing one connection per in-flight request per hop.
    private static final int CONCURRENCY = 8;

    @Test
    void concurrentActionItemConversionsResolveToOneCanonicalTaskAndLink() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        // TestAuthSupport sets this on the main thread's SecurityContextHolder (ThreadLocal,
        // default strategy); worker threads below need it set explicitly on their own threads.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Note note = new Note("Standup notes");
        note.setUserId(alice.getId());
        note.setBody("Discussed API contract");
        Note savedNote = noteRepository.save(note);

        NoteBlock block = new NoteBlock();
        block.setUserId(alice.getId());
        block.setNote(savedNote);
        block.setType("checklist_item");
        block.setContent("Confirm API contract with mobile team");
        NoteBlock savedBlock = noteBlockRepository.save(block);

        String requestBody = objectMapper.writeValueAsString(Map.of("noteBlockId", savedBlock.getId()));

        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);
        CountDownLatch ready = new CountDownLatch(CONCURRENCY);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<MvcResult>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < CONCURRENCY; i++) {
                futures.add(executor.submit(() -> {
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    ready.countDown();
                    go.await();
                    return mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", savedNote.getId())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(requestBody))
                            .andReturn();
                }));
            }

            assertThat(ready.await(10, TimeUnit.SECONDS)).as("all workers reached the starting line").isTrue();
            go.countDown();

            List<MvcResult> results = new ArrayList<>();
            for (Future<MvcResult> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }

            Set<Long> taskIds = new HashSet<>();
            Set<Long> linkIds = new HashSet<>();
            for (MvcResult result : results) {
                // The concurrency-safety contract: no request that raced against another may
                // surface that race as an error - every one of them resolves to a real response.
                assertThat(result.getResponse().getStatus())
                        .as("no 4xx/5xx should leak through a raced conversion")
                        .isEqualTo(201);
                JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
                taskIds.add(json.get("task").get("id").asLong());
                linkIds.add(json.get("link").get("id").asLong());
            }

            assertThat(taskIds).as("all concurrent conversions resolve to the same canonical task").hasSize(1);
            assertThat(linkIds).as("all concurrent conversions resolve to the same canonical link").hasSize(1);

            long tasksFromThisNote = taskRepository.findByUserId(alice.getId()).stream()
                    .filter(task -> savedNote.getId().equals(task.getSourceNoteId()))
                    .count();
            assertThat(tasksFromThisNote).as("exactly one task durably created for this action item").isEqualTo(1);
            assertThat(noteTaskLinkRepository.findByUserIdAndNoteBlockId(alice.getId(), savedBlock.getId()))
                    .as("exactly one conversion link durably exists").hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }
}
