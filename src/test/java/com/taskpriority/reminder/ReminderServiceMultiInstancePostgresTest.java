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

import java.sql.Timestamp;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
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
     * Simulates a horizontally-scaled deployment: {@code workerCount} distinct worker identities
     * (a single JVM's {@link WorkerIdentity} bean is one-per-process, so a fixed worker id per
     * thread stands in for "N separate application instances") race directly against
     * {@link NotificationOutboxRepository#claimBatch} - the same entry point every instance's
     * {@link ReminderService#dispatchNotifications()} calls - to claim a large batch of pending
     * entries. Proves exactly-once claiming at scale (every entry claimed by precisely one worker,
     * and stamped with that worker's id in the database) and returns the measured throughput so
     * the caller can compare single- vs multi-worker performance.
     */
    private double claimAllEntriesConcurrentlyAndMeasureThroughput(int entryCount, int workerCount, int batchSize) throws Exception {
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
        if (workerCount > 1) {
            assertTrue(claimsPerWorker.size() > 1, "benchmark is only meaningful if more than one worker actually claimed rows");
        }

        Integer processingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_outbox WHERE status = 'PROCESSING'", Integer.class);
        assertEquals(entryCount, processingCount, "every claimed row must be flipped to PROCESSING");

        for (Map.Entry<Long, String> claim : claimedIdToWorker.entrySet()) {
            String storedWorkerId = jdbcTemplate.queryForObject(
                    "SELECT worker_id FROM notification_outbox WHERE id = ?", String.class, claim.getKey());
            assertEquals(claim.getValue(), storedWorkerId, "the worker_id column must record which worker actually claimed the row");
        }

        double throughputPerSecond = entryCount * 1000.0 / elapsedMillis;
        logger.info("Throughput: {} entries claimed by {} worker(s) in {} ms ({} entries/sec)",
                entryCount, workerCount, elapsedMillis, String.format("%.1f", throughputPerSecond));
        return throughputPerSecond;
    }

    @Test
    void manyConcurrentWorkersClaimEveryEntryExactlyOnceAndReportThroughput() throws Exception {
        double throughputPerSecond = claimAllEntriesConcurrentlyAndMeasureThroughput(2000, 8, 50);
        assertTrue(throughputPerSecond > 50, "claim throughput regressed severely: only " + throughputPerSecond + " entries/sec");
    }

    /**
     * The performance requirement from issue #255: throughput must actually increase as workers
     * are added, not just stay flat (which would mean the removed leader lock wasn't the real
     * bottleneck, or claiming has some other hidden serialization point). Uses a generous 1.3x
     * margin rather than a tight ratio - this runs against a real Testcontainers Postgres on
     * whatever CI hardware is available, where run-to-run variance is real, but 8 genuinely
     * concurrent claimers should still clear a single claimer by a comfortable margin.
     */
    @Test
    void throughputIncreasesWithMoreConcurrentWorkers() throws Exception {
        double singleWorkerThroughput = claimAllEntriesConcurrentlyAndMeasureThroughput(1500, 1, 50);
        cleanDatabase();
        double eightWorkerThroughput = claimAllEntriesConcurrentlyAndMeasureThroughput(1500, 8, 50);

        logger.info("Throughput comparison: 1 worker = {} entries/sec, 8 workers = {} entries/sec",
                String.format("%.1f", singleWorkerThroughput), String.format("%.1f", eightWorkerThroughput));
        assertTrue(eightWorkerThroughput > singleWorkerThroughput * 1.3,
                "adding workers should meaningfully increase claim throughput: 1 worker=" + singleWorkerThroughput
                        + "/sec, 8 workers=" + eightWorkerThroughput + "/sec");
    }

    /**
     * Proves the acceptance criterion "a recovered row cannot be marked SENT by both the original
     * and replacement worker without detection": worker A claims a row, its lease is force-expired
     * (simulating A being stuck - e.g. a long GC pause or network partition, not actually dead) and
     * recovered, worker B reclaims the same row, and then A - unaware it was ever reclaimed -
     * finally tries to persist its own (stale) delivery outcome. That write must be detected and
     * discarded rather than silently overwriting whatever B has since done with the row.
     */
    @Test
    void aRecoveredAndReclaimedRowCannotBeOverwrittenByTheOriginalWorkersStaleOutcome() {
        Long reminderId = insertReminder(user.getId());
        insertPendingOutboxEntry(reminderId);

        NotificationOutboxEntry claimedByA = notificationOutboxRepository.claimBatch(LocalDateTime.now(), 10, "worker-a").get(0);
        LocalDateTime staleFencingToken = claimedByA.getProcessingStartedAt();

        // Force the lease to look expired, as if worker A has been stuck for well past the timeout.
        jdbcTemplate.update("UPDATE notification_outbox SET processing_started_at = ? WHERE id = ?",
                LocalDateTime.now().minusHours(1), claimedByA.getId());
        int recovered = notificationOutboxRepository.recoverStuckProcessing(LocalDateTime.now().minusMinutes(5), LocalDateTime.now());
        assertEquals(1, recovered, "the lease-expired row must be recovered back to PENDING");

        NotificationOutboxEntry claimedByB = notificationOutboxRepository.claimBatch(LocalDateTime.now(), 10, "worker-b").get(0);
        assertEquals(claimedByA.getId(), claimedByB.getId());

        // Worker A, unaware it was ever reclaimed, now tries to persist its own stale outcome using
        // the processing_started_at it originally observed at claim time.
        boolean staleWriteApplied = notificationOutboxRepository.markDelivered(claimedByA.getId(), staleFencingToken, LocalDateTime.now());
        assertFalse(staleWriteApplied, "worker A's stale delivery outcome must be detected and rejected, not silently applied");

        String statusAfterStaleWrite = jdbcTemplate.queryForObject(
                "SELECT status FROM notification_outbox WHERE id = ?", String.class, claimedByA.getId());
        assertEquals("PROCESSING", statusAfterStaleWrite, "worker B's claim must still stand - it hasn't reported an outcome yet");

        // Worker B's own outcome, using the fencing token it actually observed, must succeed normally.
        boolean bsWriteApplied = notificationOutboxRepository.markDelivered(claimedByB.getId(), claimedByB.getProcessingStartedAt(), LocalDateTime.now());
        assertTrue(bsWriteApplied, "the replacement worker's own outcome must apply normally");
    }

    /**
     * Documents/verifies the "confirm the (status, next_attempt_at) index is used" requirement
     * from issue #255's performance-test section: with a realistic mix of statuses in the table,
     * the dispatcher's claim query must not fall back to a full table scan.
     */
    @Test
    void claimQueryUsesTheCompositeStatusNextAttemptIndexNotASequentialScan() {
        Long reminderId = insertReminder(user.getId());
        List<Object[]> batchArgs = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 5000; i++) {
            String status = i % 20 == 0 ? "PENDING" : "SENT";
            batchArgs.add(new Object[] {user.getId(), reminderId, NotificationChannel.IN_APP.name(), "Row " + i, status, now.minusMinutes(1)});
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO notification_outbox (user_id, reminder_id, channel, title, status, attempts, max_attempts, next_attempt_at) " +
                        "VALUES (?, ?, ?, ?, ?, 0, 5, ?)",
                batchArgs);
        jdbcTemplate.execute("ANALYZE notification_outbox");

        List<String> plan = jdbcTemplate.queryForList(
                "EXPLAIN SELECT id FROM notification_outbox WHERE status = 'PENDING' AND next_attempt_at <= ? "
                        + "ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 50",
                String.class, Timestamp.valueOf(now));
        String planText = String.join("\n", plan);
        logger.info("Claim query plan:\n{}", planText);

        assertFalse(planText.contains("Seq Scan on notification_outbox"),
                "the claim query must use the (status, next_attempt_at) index, not a full table scan:\n" + planText);
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
