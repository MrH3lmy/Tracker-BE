package com.taskpriority.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Regression coverage for GitHub issue #256: before V43, boards/board_columns had a permanently
 * NULL user_id (see V29's comment) because there was no per-user board provisioning. V43 backfills
 * a board+columns for every existing user, repoints their tasks at their own columns (matched by
 * status), and retires the old globally-shared board. This exercises that backfill against a
 * database seeded to look like a real pre-V43 install, not just the resulting schema shape.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class BoardIsolationMigrationPostgresTest {

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
    JdbcTemplate jdbcTemplate;

    @Test
    void backfillGivesEveryUserTheirOwnBoardAndRepointsTasksByStatus() {
        jdbcTemplate.execute("DROP SCHEMA public CASCADE");
        jdbcTemplate.execute("CREATE SCHEMA public");

        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target("42")
                .load()
                .migrate();

        Long alice = jdbcTemplate.queryForObject(
                "INSERT INTO users (email, password_hash, display_name) VALUES ('alice@x.com', 'h', 'Alice') RETURNING id", Long.class);
        Long bob = jdbcTemplate.queryForObject(
                "INSERT INTO users (email, password_hash, display_name) VALUES ('bob@x.com', 'h', 'Bob') RETURNING id", Long.class);

        // V2 seeds exactly one globally-shared column per status - both users' pre-existing tasks
        // point at the same shared row.
        Long sharedInProgressColumn = jdbcTemplate.queryForObject(
                "SELECT id FROM board_columns WHERE status = 'IN_PROGRESS'", Long.class);

        Long aliceTask = jdbcTemplate.queryForObject(
                "INSERT INTO tasks (user_id, title, area, effort, status, position, board_column_id) " +
                        "VALUES (?, 'Alice task', 'WORK', 'MEDIUM', 'IN_PROGRESS', 1000, ?) RETURNING id",
                Long.class, alice, sharedInProgressColumn);
        Long bobTask = jdbcTemplate.queryForObject(
                "INSERT INTO tasks (user_id, title, area, effort, status, position, board_column_id) " +
                        "VALUES (?, 'Bob task', 'WORK', 'MEDIUM', 'IN_PROGRESS', 1000, ?) RETURNING id",
                Long.class, bob, sharedInProgressColumn);

        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("42")
                .load()
                .migrate();

        Long aliceColumnAfter = jdbcTemplate.queryForObject("SELECT board_column_id FROM tasks WHERE id = ?", Long.class, aliceTask);
        Long bobColumnAfter = jdbcTemplate.queryForObject("SELECT board_column_id FROM tasks WHERE id = ?", Long.class, bobTask);

        assertThat(aliceColumnAfter).isNotNull().isNotEqualTo(bobColumnAfter);
        assertThat(jdbcTemplate.queryForObject("SELECT user_id FROM board_columns WHERE id = ?", Long.class, aliceColumnAfter)).isEqualTo(alice);
        assertThat(jdbcTemplate.queryForObject("SELECT user_id FROM board_columns WHERE id = ?", Long.class, bobColumnAfter)).isEqualTo(bob);

        // Every user gets the full 7-status layout, not just the status their pre-existing task used.
        Integer aliceColumnCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM board_columns WHERE user_id = ?", Integer.class, alice);
        assertThat(aliceColumnCount).isEqualTo(7);

        // The old globally-shared board/columns are gone - nothing with a null user_id survives.
        Integer orphanedBoards = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM boards WHERE user_id IS NULL", Integer.class);
        Integer orphanedColumns = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM board_columns WHERE user_id IS NULL", Integer.class);
        assertThat(orphanedBoards).isZero();
        assertThat(orphanedColumns).isZero();

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "UPDATE tasks SET board_column_id = ? WHERE id = ?", bobColumnAfter, aliceTask));
    }
}
