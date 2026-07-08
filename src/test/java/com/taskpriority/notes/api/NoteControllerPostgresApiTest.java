package com.taskpriority.notes.api;

import com.taskpriority.model.Note;
import com.taskpriority.repository.NoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class NoteControllerPostgresApiTest {

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
    private MockMvc mockMvc;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seedNotes() {
        jdbcTemplate.execute("TRUNCATE TABLE notes RESTART IDENTITY CASCADE");

        Note oldNote = saveNote("Old note");
        Note middleNote = saveNote("Middle note");
        Note newNote = saveNote("New note");

        setTimestamps(oldNote, LocalDateTime.of(2024, 1, 10, 9, 0), LocalDateTime.of(2024, 2, 10, 9, 0));
        setTimestamps(middleNote, LocalDateTime.of(2024, 3, 10, 9, 0), LocalDateTime.of(2024, 4, 10, 9, 0));
        setTimestamps(newNote, LocalDateTime.of(2024, 5, 10, 9, 0), LocalDateTime.of(2024, 6, 10, 9, 0));
    }

    @Test
    void findAllWithoutDateFiltersReturnsStableResponseShape() throws Exception {
        mockMvc.perform(get("/api/v1/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].title", contains("New note", "Middle note", "Old note")))
                .andExpect(jsonPath("$[0].id", notNullValue()))
                .andExpect(jsonPath("$[0].title", notNullValue()))
                .andExpect(jsonPath("$[0].body", notNullValue()))
                .andExpect(jsonPath("$[0].contentType", notNullValue()))
                .andExpect(jsonPath("$[0].displayOrder", notNullValue()))
                .andExpect(jsonPath("$[0].zIndex", notNullValue()))
                .andExpect(jsonPath("$[0].tags", hasSize(0)))
                .andExpect(jsonPath("$[0].attachments", hasSize(0)))
                .andExpect(jsonPath("$[0].taskLinks", hasSize(0)))
                .andExpect(jsonPath("$[0].createdAt", notNullValue()))
                .andExpect(jsonPath("$[0].updatedAt", notNullValue()));
    }

    @Test
    void findAllFiltersByCreatedFromOnly() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("createdFrom", "2024-03-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", contains("New note", "Middle note")))
                .andExpect(jsonPath("$[*].title", not(hasItem("Old note"))));
    }

    @Test
    void findAllFiltersByCreatedToOnly() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("createdTo", "2024-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", contains("Middle note", "Old note")))
                .andExpect(jsonPath("$[*].title", not(hasItem("New note"))));
    }

    @Test
    void findAllFiltersByUpdatedFromOnly() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("updatedFrom", "2024-04-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", contains("New note", "Middle note")))
                .andExpect(jsonPath("$[*].title", not(hasItem("Old note"))));
    }

    @Test
    void findAllFiltersByUpdatedToOnly() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("updatedTo", "2024-04-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", contains("Middle note", "Old note")))
                .andExpect(jsonPath("$[*].title", not(hasItem("New note"))));
    }

    @Test
    void findAllTreatsBlankDateFiltersAsAbsent() throws Exception {
        mockMvc.perform(get("/api/v1/notes")
                        .param("createdFrom", "")
                        .param("createdTo", "")
                        .param("updatedFrom", "")
                        .param("updatedTo", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].title", contains("New note", "Middle note", "Old note")));
    }

    @Test
    void findAllTagModeAnyWithoutTagsDoesNotFilterResults() throws Exception {
        mockMvc.perform(get("/api/v1/notes").param("tagMode", "any"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].title", contains("New note", "Middle note", "Old note")))
                .andExpect(jsonPath("$[*].tags", everyItem(hasSize(0))));
    }

    private Note saveNote(String title) {
        Note note = new Note(title);
        note.setBody(title + " body");
        return noteRepository.saveAndFlush(note);
    }

    private void setTimestamps(Note note, LocalDateTime createdAt, LocalDateTime updatedAt) {
        jdbcTemplate.update("UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?", createdAt, updatedAt, note.getId());
    }
}
