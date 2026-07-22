package com.taskpriority.reminder;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
