package com.taskpriority.migration;

import com.taskpriority.model.User;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Regression coverage for GitHub issue #224: composite (user_id, id) foreign keys added in V42
 * must make cross-user references impossible at the PostgreSQL level, independent of any
 * application-layer check. Exercised with a real Postgres container (H2 doesn't support the same
 * NOT VALID/VALIDATE + composite FK machinery used by the migration).
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class CompositeTenantIsolationPostgresTest {

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
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long aliceId;
    private Long bobId;

    @BeforeEach
    void seedUsers() {
        jdbcTemplate.execute("TRUNCATE TABLE task_dependencies, note_task_links, notes, note_collections, tasks, milestones, projects, " +
                "board_columns, boards, focus_session_pauses, focus_sessions, reminders, habits, users RESTART IDENTITY CASCADE");
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        User bob = TestAuthSupport.loginAsNewUser(userRepository);
        aliceId = alice.getId();
        bobId = bob.getId();
    }

    private Long insertBoard(Long userId, String name) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO boards (user_id, name) VALUES (?, ?) RETURNING id", Long.class, userId, name);
    }

    private Long insertBoardColumn(Long userId, Long boardId, String status) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO board_columns (user_id, board_id, name, status, position) VALUES (?, ?, ?, ?, 1000) RETURNING id",
                Long.class, userId, boardId, status, status);
    }

    private Long insertFocusSession(Long userId) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO focus_sessions (user_id, started_at, status) VALUES (?, now(), 'RUNNING') RETURNING id", Long.class, userId);
    }

    private Long insertHabit(Long userId, String title) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO habits (user_id, title, daily_target_count) VALUES (?, ?, 1) RETURNING id", Long.class, userId, title);
    }

    private Long insertTask(Long userId, String title) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO tasks (user_id, title, area, effort, status, position) VALUES (?, ?, 'WORK', 'MEDIUM', 'NOT_STARTED', 1000) RETURNING id",
                Long.class, userId, title);
    }

    private Long insertProject(Long userId, String name) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO projects (user_id, name) VALUES (?, ?) RETURNING id", Long.class, userId, name);
    }

    @Test
    void taskCanReferenceAProjectOwnedByTheSameUser() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long aliceProject = insertProject(aliceId, "Alice project");

        assertDoesNotThrow(() -> jdbcTemplate.update("UPDATE tasks SET project_id = ? WHERE id = ?", aliceProject, aliceTask));
    }

    @Test
    void taskCannotReferenceAnotherUsersProject() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long bobProject = insertProject(bobId, "Bob project");

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE tasks SET project_id = ? WHERE id = ?", bobProject, aliceTask));
    }

    @Test
    void milestoneCannotReferenceAnotherUsersProject() {
        Long bobProject = insertProject(bobId, "Bob project");

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO milestones (user_id, project_id, title) VALUES (?, ?, 'Alice milestone on Bob project')",
                aliceId, bobProject));
    }

    @Test
    void milestoneCanReferenceAProjectOwnedByTheSameUser() {
        Long aliceProject = insertProject(aliceId, "Alice project");

        assertDoesNotThrow(() -> jdbcTemplate.update(
                "INSERT INTO milestones (user_id, project_id, title) VALUES (?, ?, 'Alice milestone')",
                aliceId, aliceProject));
    }

    @Test
    void taskCannotUseAnotherUsersTaskAsParent() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long bobTask = insertTask(bobId, "Bob task");

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE tasks SET parent_task_id = ? WHERE id = ?", bobTask, aliceTask));
    }

    @Test
    void taskCanUseItsOwnUsersTaskAsParent() {
        Long aliceParent = insertTask(aliceId, "Alice parent");
        Long aliceChild = insertTask(aliceId, "Alice child");

        assertDoesNotThrow(() -> jdbcTemplate.update("UPDATE tasks SET parent_task_id = ? WHERE id = ?", aliceParent, aliceChild));
    }

    @Test
    void dependencyCannotConnectTasksFromDifferentUsers() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long bobTask = insertTask(bobId, "Bob task");

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO task_dependencies (user_id, task_id, blocks_task_id, dependency_type) VALUES (?, ?, ?, 'BLOCKS')",
                aliceId, aliceTask, bobTask));
    }

    @Test
    void linkedNotesCannotCrossUserBoundaries() {
        Long bobTask = insertTask(bobId, "Bob task");
        Long aliceNote = jdbcTemplate.queryForObject(
                "INSERT INTO notes (user_id, title, content_type) VALUES (?, 'Alice note', 'MARKDOWN') RETURNING id", Long.class, aliceId);

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO note_task_links (user_id, note_id, task_id, link_type) VALUES (?, ?, ?, 'MENTION')",
                aliceId, aliceNote, bobTask));
    }

    @Test
    void noteCannotReferenceAnotherUsersCollection() {
        Long aliceNote = jdbcTemplate.queryForObject(
                "INSERT INTO notes (user_id, title, content_type) VALUES (?, 'Alice note', 'MARKDOWN') RETURNING id", Long.class, aliceId);
        Long bobCollection = jdbcTemplate.queryForObject(
                "INSERT INTO note_collections (user_id, name, created_at, updated_at) VALUES (?, 'Bob collection', now(), now()) RETURNING id", Long.class, bobId);

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE notes SET collection_id = ? WHERE id = ?", bobCollection, aliceNote));
    }

    @Test
    void nullableRelationshipsStillAcceptNull() {
        Long aliceTask = insertTask(aliceId, "Alice task");

        assertDoesNotThrow(() -> jdbcTemplate.update("UPDATE tasks SET parent_task_id = NULL, project_id = NULL WHERE id = ?", aliceTask));
    }

    // --- V43: per-user boards/board_columns (issue #256) ---

    @Test
    void boardColumnCannotReferenceAnotherUsersBoard() {
        Long bobBoard = insertBoard(bobId, "Bob board");

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO board_columns (user_id, board_id, name, status, position) VALUES (?, ?, 'Backlog', 'BACKLOG', 1000)",
                aliceId, bobBoard));
    }

    @Test
    void boardColumnCanReferenceItsOwnUsersBoard() {
        Long aliceBoard = insertBoard(aliceId, "Alice board");

        assertDoesNotThrow(() -> insertBoardColumn(aliceId, aliceBoard, "BACKLOG"));
    }

    @Test
    void taskCannotReferenceAnotherUsersBoardColumn() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long bobBoard = insertBoard(bobId, "Bob board");
        Long bobColumn = insertBoardColumn(bobId, bobBoard, "BACKLOG");

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("UPDATE tasks SET board_column_id = ? WHERE id = ?", bobColumn, aliceTask));
    }

    @Test
    void taskCanReferenceItsOwnUsersBoardColumn() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long aliceBoard = insertBoard(aliceId, "Alice board");
        Long aliceColumn = insertBoardColumn(aliceId, aliceBoard, "BACKLOG");

        assertDoesNotThrow(() -> jdbcTemplate.update("UPDATE tasks SET board_column_id = ? WHERE id = ?", aliceColumn, aliceTask));
    }

    // --- V44: focus_session_pauses and projects.owner_user_id (issue #256) ---

    @Test
    void focusSessionPauseCannotReferenceAnotherUsersSession() {
        Long bobSession = insertFocusSession(bobId);

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO focus_session_pauses (user_id, session_id, paused_at) VALUES (?, ?, now())", aliceId, bobSession));
    }

    @Test
    void focusSessionPauseCanReferenceItsOwnUsersSession() {
        Long aliceSession = insertFocusSession(aliceId);

        assertDoesNotThrow(() -> jdbcTemplate.update(
                "INSERT INTO focus_session_pauses (user_id, session_id, paused_at) VALUES (?, ?, now())", aliceId, aliceSession));
    }

    @Test
    void projectOwnerUserIdMustReferenceARealUser() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO projects (user_id, name, owner_user_id) VALUES (?, 'Alice project', -1)", aliceId));
    }

    // --- V45: reminders.reference_id polymorphic ownership trigger (issue #256) ---

    private void insertReminder(Long userId, String kind, Long referenceId, String idempotencyKey) {
        jdbcTemplate.update(
                "INSERT INTO reminders (user_id, kind, reference_id, scheduled_for, status, idempotency_key) " +
                        "VALUES (?, ?, ?, now(), 'PENDING', ?)",
                userId, kind, referenceId, idempotencyKey);
    }

    @Test
    void reminderCannotReferenceAnotherUsersTask() {
        Long bobTask = insertTask(bobId, "Bob task");

        assertThrows(DataAccessException.class, () -> insertReminder(aliceId, "TASK_DUE", bobTask, "k1"));
    }

    @Test
    void reminderCannotReferenceAnotherUsersHabit() {
        Long bobHabit = insertHabit(bobId, "Bob habit");

        assertThrows(DataAccessException.class, () -> insertReminder(aliceId, "HABIT", bobHabit, "k2"));
    }

    @Test
    void reminderCanReferenceItsOwnUsersTaskAndHabit() {
        Long aliceTask = insertTask(aliceId, "Alice task");
        Long aliceHabit = insertHabit(aliceId, "Alice habit");

        assertDoesNotThrow(() -> insertReminder(aliceId, "FOLLOW_UP", aliceTask, "k3"));
        assertDoesNotThrow(() -> insertReminder(aliceId, "HABIT", aliceHabit, "k4"));
    }
}
