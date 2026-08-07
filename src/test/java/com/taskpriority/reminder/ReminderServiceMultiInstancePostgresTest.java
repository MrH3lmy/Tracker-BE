package com.taskpriority.reminder;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.NotificationOutboxRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression coverage for GitHub issue #225: with multiple application instances (simulated here
 * as concurrent threads calling the same @Scheduled methods, all racing against one real
 * PostgreSQL database), the reminder producer must never create duplicate occurrences and the
 * outbox dispatcher must never double-claim/double-send a row. Both guarantees come from real
 * Postgres behavior (pg_try_advisory_xact_lock and FOR UPDATE SKIP LOCKED) that H2 can't exercise.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@TestPropertySource(properties = "app.reminders.scheduling-enabled=false") // drive the jobs manually, not on a timer
class ReminderServiceMultiInstancePostgresTest {

    private static final Logger logger = LoggerFactory.getLogger(ReminderServiceMultiInstancePostgresTest.class);

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

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private NotificationOutboxRepository notificationOutboxRepository;

    private User user;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("TRUNCATE TABLE notification_outbox, reminders, tasks, users RESTART IDENTITY CASCADE");
        user = TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void twoConcurrentProducerRunsCreateOnlyOneReminderOccurrence() throws Exception {
        Task task = new Task("Ship the release notes");
        task.setUserId(user.getId());
        task.setStatus(Status.NOT_STARTED);
        task.setDueDate(LocalDate.now());
        task.setPosition(1000);
        taskRepository.save(task);

        runConcurrently(reminderService::produceReminders, reminderService::produceReminders);

        Integer reminderCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reminders WHERE user_id = ? AND reference_id = ?", Integer.class, user.getId(), task.getId());
        assertEquals(1, reminderCount, "exactly one reminder occurrence should exist despite two concurrent producer runs");
    }

    @Test
    void twoConcurrentDispatcherRunsClaimDisjointRowsAndSendEachExactlyOnce() throws Exception {
        Long reminderId1 = insertReminder(user.getId());
        Long reminderId2 = insertReminder(user.getId());
        insertPendingOutboxEntry(reminderId1);
        insertPendingOutboxEntry(reminderId2);

        runConcurrently(reminderService::dispatchNotifications, reminderService::dispatchNotifications);

        Integer sentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_outbox WHERE status = 'SENT'", Integer.class);
        Integer nonSentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_outbox WHERE status <> 'SENT'", Integer.class);
        assertEquals(2, sentCount, "both entries should end up sent exactly once");
        assertEquals(0, nonSentCount, "no entry should be left claimed-but-unprocessed or double-claimed");
    }

    /**
     * Simulates a horizontally-scaled deployment: {@code WORKER_COUNT} distinct worker identities
     * (a single JVM's {@link WorkerIdentity} bean is one-per-process, so a fixed worker id per
     * thread stands in for "N separate application instances") race directly against
     * {@link NotificationOutboxRepository#claimBatch} - the same entry point every instance's
     * {@link ReminderService#dispatchNotifications()} calls - to claim a large batch of pending
     * entries. This proves two acceptance criteria from issue #255 in one run: exactly-once
     * delivery at scale (every entry claimed by precisely one worker, and stamped with that
     * worker's id in the database) and reports achieved throughput as a benchmark figure.
     */
    @Test
    void manyConcurrentWorkersClaimEveryEntryExactlyOnceAndReportThroughput() throws Exception {
        int entryCount = 2000;
        int workerCount = 8;
        int batchSize = 50;

        Long reminderId = insertReminder(user.getId());
        List<Object[]> batchArgs = new ArrayList<>(entryCount);
        LocalDateTime dueAt = LocalDateTime.now().minusMinutes(1);
        for (int i = 0; i < entryCount; i++) {
            batchArgs.add(new Object[] {user.getId(), reminderId, NotificationChannel.IN_APP.name(), "Benchmark notification " + i, dueAt});
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO notification_outbox (user_id, reminder_id, channel, title, status, attempts, max_attempts, next_attempt_at) " +
                        "VALUES (?, ?, ?, ?, 'PENDING', 0, 5, ?)",
                batchArgs);

        ConcurrentHashMap<Long, String> claimedIdToWorker = new ConcurrentHashMap<>();
        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        long startNanos = System.nanoTime();
        try {
            List<Callable<Void>> tasks = new ArrayList<>(workerCount);
            for (int w = 0; w < workerCount; w++) {
                String workerId = "bench-worker-" + w;
                tasks.add(() -> {
                    List<NotificationOutboxEntry> batch;
                    while (!(batch = notificationOutboxRepository.claimBatch(LocalDateTime.now(), batchSize, workerId)).isEmpty()) {
                        for (NotificationOutboxEntry entry : batch) {
                            String previousOwner = claimedIdToWorker.putIfAbsent(entry.getId(), workerId);
                            assertNull(previousOwner, "entry " + entry.getId() + " was claimed by more than one worker");
                        }
                    }
                    return null;
                });
            }
            for (var future : executor.invokeAll(tasks, 60, TimeUnit.SECONDS)) {
                future.get();
            }
        } finally {
            executor.shutdownNow();
        }
        long elapsedMillis = Math.max(1, (System.nanoTime() - startNanos) / 1_000_000);

        assertEquals(entryCount, claimedIdToWorker.size(), "every entry must be claimed exactly once across all workers");

        Map<String, Long> claimsPerWorker = claimedIdToWorker.values().stream()
                .collect(Collectors.groupingBy(w -> w, Collectors.counting()));
        assertTrue(claimsPerWorker.size() > 1, "benchmark is only meaningful if more than one worker actually claimed rows");

        Integer processingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_outbox WHERE status = 'PROCESSING'", Integer.class);
        assertEquals(entryCount, processingCount, "every claimed row must be flipped to PROCESSING");

        for (Map.Entry<Long, String> claim : claimedIdToWorker.entrySet()) {
            String storedWorkerId = jdbcTemplate.queryForObject(
                    "SELECT worker_id FROM notification_outbox WHERE id = ?", String.class, claim.getKey());
            assertEquals(claim.getValue(), storedWorkerId, "the worker_id column must record which worker actually claimed the row");
        }

        double throughputPerSecond = entryCount * 1000.0 / elapsedMillis;
        logger.info("Throughput benchmark: {} entries claimed by {} workers in {} ms ({} entries/sec)",
                entryCount, workerCount, elapsedMillis, String.format("%.1f", throughputPerSecond));
        assertTrue(throughputPerSecond > 50, "claim throughput regressed severely: only " + throughputPerSecond + " entries/sec");
    }

    private void runConcurrently(Runnable first, Runnable second) throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Void> wrap1 = () -> { barrier.await(10, TimeUnit.SECONDS); first.run(); return null; };
            Callable<Void> wrap2 = () -> { barrier.await(10, TimeUnit.SECONDS); second.run(); return null; };
            List<java.util.concurrent.Future<Void>> futures = executor.invokeAll(List.of(wrap1, wrap2));
            for (var future : futures) {
                future.get(15, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private Long insertReminder(Long userId) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO reminders (user_id, kind, reference_id, scheduled_for, status, idempotency_key) " +
                        "VALUES (?, 'TASK_DUE', NULL, ?, 'PENDING', ?) RETURNING id",
                Long.class, userId, LocalDateTime.now().minusMinutes(1), "test-" + java.util.UUID.randomUUID());
    }

    private void insertPendingOutboxEntry(Long reminderId) {
        jdbcTemplate.update(
                "INSERT INTO notification_outbox (user_id, reminder_id, channel, title, status, attempts, max_attempts, next_attempt_at) " +
                        "VALUES (?, ?, ?, ?, 'PENDING', 0, 5, ?)",
                user.getId(), reminderId, NotificationChannel.IN_APP.name(), "Test notification", LocalDateTime.now().minusMinutes(1));
    }
}
