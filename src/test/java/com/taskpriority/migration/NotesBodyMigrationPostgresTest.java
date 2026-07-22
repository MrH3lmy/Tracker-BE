package com.taskpriority.migration;

import com.taskpriority.model.Note;
import com.taskpriority.repository.NoteRepository;
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

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class NotesBodyMigrationPostgresTest {

    private static final String BODY_TEXT = "Readable UTF-8 café migration note";

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

    @Autowired
    NoteRepository noteRepository;

    // V1-V5 are executed for real through Flyway so the fixture can never drift from the actual
    // historical schema (boards, task_dependencies, recurrence_rules, etc. all come from the real
    // migration files, not a hand-copied subset). Only the notes table - the one V6 table this test
    // actually cares about - is recreated by hand, matching V6__create_notes.sql exactly except for
    // "body BYTEA" in place of "body TEXT", reproducing the legacy pre-conversion column type that
    // V7 is responsible for fixing.
    @BeforeEach
    void setUpLegacyByteaSchema() {
        jdbcTemplate.execute("DROP SCHEMA public CASCADE");
        jdbcTemplate.execute("CREATE SCHEMA public");

        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target("5")
                .load()
                .migrate();

        // Forget Flyway's own bookkeeping (but keep the real V1-V5 tables/data it just created) so
        // the test method below can re-baseline at version 6 once the legacy notes table exists.
        jdbcTemplate.execute("DROP TABLE flyway_schema_history");

        jdbcTemplate.execute("""
                CREATE TABLE notes (
                    id BIGSERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    body BYTEA,
                    content_type VARCHAR(40) NOT NULL DEFAULT 'PLAIN_TEXT',
                    task_id BIGINT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_notes_task
                        FOREIGN KEY (task_id)
                        REFERENCES tasks(id)
                        ON DELETE SET NULL
                )
                """);
        jdbcTemplate.execute("CREATE INDEX idx_notes_task_id ON notes(task_id)");
        jdbcTemplate.execute("CREATE INDEX idx_notes_content_type ON notes(content_type)");
        jdbcTemplate.execute("CREATE INDEX idx_notes_created_at ON notes(created_at)");
        jdbcTemplate.update(
                "INSERT INTO notes (title, body, content_type) VALUES (?, ?, 'PLAIN_TEXT')",
                "Migrated bytea note",
                BODY_TEXT.getBytes(StandardCharsets.UTF_8)
        );
    }

    @Test
    void convertsExistingByteaNotesBodyToTextAndKeepsSearchWorking() {
        String beforeType = notesBodyDataType();
        assertThat(beforeType).isEqualTo("bytea");

        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("6")
                .load()
                .migrate();

        assertThat(notesBodyDataType()).isEqualTo("text");
        assertThat(jdbcTemplate.queryForObject("SELECT body FROM notes WHERE title = ?", String.class, "Migrated bytea note"))
                .isEqualTo(BODY_TEXT);

        List<Note> matches = noteRepository.findAllMatching(1L, null, "café", null);

        assertThat(matches)
                .extracting(Note::getBody)
                .contains(BODY_TEXT);
    }

    private String notesBodyDataType() {
        return jdbcTemplate.queryForObject("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'notes'
                  AND column_name = 'body'
                """, String.class);
    }
}
