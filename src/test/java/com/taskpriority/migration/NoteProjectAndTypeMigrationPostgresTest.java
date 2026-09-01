package com.taskpriority.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression coverage for issue #287's V52 migration: a note row that existed before project_id/
 * note_type were added must migrate to a deterministic default (note_type = GENERAL, project_id
 * still NULL) without any manual backfill statement - Postgres applies the column default to
 * existing rows as part of the ADD COLUMN itself.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class NoteProjectAndTypeMigrationPostgresTest {

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

    private Long legacyUserId;

    @BeforeEach
    void setUpPreV52Schema() {
        jdbcTemplate.execute("DROP SCHEMA public CASCADE");
        jdbcTemplate.execute("CREATE SCHEMA public");

        // Migrate up to V51 - the last version before notes gained project_id/note_type - so the
        // note row below is inserted exactly as an old client/row would have existed.
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target("51")
                .load()
                .migrate();

        legacyUserId = jdbcTemplate.queryForObject(
                "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id",
                Long.class, "legacy-notes-user@example.com", "irrelevant-hash");
        jdbcTemplate.update(
                "INSERT INTO notes (user_id, title, body, content_type) VALUES (?, ?, ?, 'PLAIN_TEXT')",
                legacyUserId, "Pre-existing note", "Written before project/type existed");
    }

    @Test
    void existingNoteRowMigratesToGeneralTypeWithNullProject() {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT note_type, project_id FROM notes WHERE title = ?", "Pre-existing note");

        assertThat(row.get("note_type")).isEqualTo("GENERAL");
        assertThat(row.get("project_id")).isNull();
    }

    @Test
    void notesProjectIdRejectsAnotherUsersProject() {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        Long otherUserId = jdbcTemplate.queryForObject(
                "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id",
                Long.class, "other-user@example.com", "irrelevant-hash");
        // owner_user_id has been NOT NULL since V44 (enforce_focus_pause_and_project_owner_isolation).
        Long otherUsersProjectId = jdbcTemplate.queryForObject(
                "INSERT INTO projects (user_id, owner_user_id, name) VALUES (?, ?, ?) RETURNING id",
                Long.class, otherUserId, otherUserId, "Other user's project");

        org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        "INSERT INTO notes (user_id, title, project_id) VALUES (?, ?, ?)",
                        legacyUserId, "Cross-tenant note", otherUsersProjectId));
    }
}
