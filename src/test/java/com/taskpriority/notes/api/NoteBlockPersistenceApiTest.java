package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.User;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.repository.NoteVersionRepository;
import com.taskpriority.repository.ProjectActivityRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.model.Project;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The block-persistence and autosave-versioning contract the note page editor depends on
 * (issue #299 follow-up).
 *
 * <p>Two invariants matter more than the happy path here:
 * <ul>
 *   <li>saving blocks must <em>preserve ids</em>, because {@code note_task_links.note_block_id} is
 *       {@code ON DELETE CASCADE} - a delete-and-reinsert save would wipe every structured
 *       action's task link and silently break the idempotency guarantee from #287/#296;</li>
 *   <li>an autosave must not mint a version snapshot per keystroke batch, or version history
 *       stops being useful.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:note-blocks-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class NoteBlockPersistenceApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NoteBlockRepository noteBlockRepository;

    @Autowired
    private NoteTaskLinkRepository noteTaskLinkRepository;

    @Autowired
    private NoteVersionRepository noteVersionRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectActivityRepository projectActivityRepository;

    @Autowired
    private ProjectRepository projectRepository;

    private User testUser;

    @BeforeEach
    void cleanDatabase() {
        projectActivityRepository.deleteAll();
        noteTaskLinkRepository.deleteAll();
        noteVersionRepository.deleteAll();
        noteBlockRepository.deleteAll();
        noteRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        testUser = TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long createProject(String name) {
        Project project = new Project();
        project.setUserId(testUser.getId());
        project.setName(name);
        return projectRepository.save(project).getId();
    }

    private long createNote(String title) throws Exception {
        String response = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"body\":\"seed\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private JsonNode update(long noteId, String body) throws Exception {
        String response = mockMvc.perform(put("/api/v1/notes/{id}", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void updateWithBlocksPersistsThemAndReturnsTheirIds() throws Exception {
        long noteId = createNote("Meeting");

        JsonNode saved = update(noteId, """
                {"title":"Meeting","body":"Agenda\\n\\nShip it","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"paragraph","content":"Agenda","checked":false},
                  {"type":"checklist","content":"Ship it","checked":false}
                ]}
                """);

        assertThat(saved.get("blocks")).hasSize(2);
        assertThat(saved.get("blocks").get(0).get("id").asLong()).isPositive();
        assertThat(saved.get("blocks").get(0).get("type").asText()).isEqualTo("paragraph");
        assertThat(saved.get("blocks").get(1).get("content").asText()).isEqualTo("Ship it");
        // Position comes from list order, so the stored order cannot disagree with the client's.
        assertThat(saved.get("blocks").get(0).get("position").asInt()).isEqualTo(0);
        assertThat(saved.get("blocks").get(1).get("position").asInt()).isEqualTo(1);
    }

    @Test
    void resendingABlockWithItsIdUpdatesTheSameRowRatherThanReplacingIt() throws Exception {
        long noteId = createNote("Meeting");
        JsonNode first = update(noteId, """
                {"title":"Meeting","body":"Draft","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"paragraph","content":"Draft","checked":false}
                ]}
                """);
        long blockId = first.get("blocks").get(0).get("id").asLong();

        JsonNode second = update(noteId, """
                {"title":"Meeting","body":"Final","contentType":"PLAIN_TEXT","blocks":[
                  {"id":%d,"type":"heading","content":"Final","checked":false}
                ]}
                """.formatted(blockId));

        assertThat(second.get("blocks")).hasSize(1);
        assertThat(second.get("blocks").get(0).get("id").asLong()).isEqualTo(blockId);
        assertThat(second.get("blocks").get(0).get("type").asText()).isEqualTo("heading");
        assertThat(noteBlockRepository.count()).isEqualTo(1);
    }

    @Test
    void savingBlocksKeepsAnAlreadyConvertedActionItemsTaskLink() throws Exception {
        long noteId = createNote("Meeting");
        JsonNode seeded = update(noteId, """
                {"title":"Meeting","body":"Send the email","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"checklist","content":"Send the email","checked":false},
                  {"type":"paragraph","content":"Notes","checked":false}
                ]}
                """);
        long actionBlockId = seeded.get("blocks").get(0).get("id").asLong();
        long paragraphId = seeded.get("blocks").get(1).get("id").asLong();

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Send the email\",\"selectedText\":\"Send the email\",\"noteBlockId\":" + actionBlockId + "}"))
                .andExpect(status().isCreated());
        assertThat(noteTaskLinkRepository.count()).isEqualTo(1);

        // A subsequent editor save that keeps the action item and edits the text around it must
        // not cascade the link away - this is the whole reason the diff preserves ids.
        JsonNode afterEdit = update(noteId, """
                {"title":"Meeting","body":"Send the email","contentType":"PLAIN_TEXT","blocks":[
                  {"id":%d,"type":"checklist","content":"Send the email","checked":true},
                  {"id":%d,"type":"paragraph","content":"Notes, revised","checked":false},
                  {"type":"paragraph","content":"A brand new line","checked":false}
                ]}
                """.formatted(actionBlockId, paragraphId));

        assertThat(afterEdit.get("blocks")).hasSize(3);
        assertThat(noteTaskLinkRepository.count()).isEqualTo(1);
        assertThat(afterEdit.get("taskLinks").get(0).get("blockId").asLong()).isEqualTo(actionBlockId);
    }

    @Test
    void droppingABlockDeletesOnlyThatBlock() throws Exception {
        long noteId = createNote("Meeting");
        JsonNode seeded = update(noteId, """
                {"title":"Meeting","body":"a b","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"paragraph","content":"keep","checked":false},
                  {"type":"paragraph","content":"drop","checked":false}
                ]}
                """);
        long keepId = seeded.get("blocks").get(0).get("id").asLong();

        JsonNode after = update(noteId, """
                {"title":"Meeting","body":"a","contentType":"PLAIN_TEXT","blocks":[
                  {"id":%d,"type":"paragraph","content":"keep","checked":false}
                ]}
                """.formatted(keepId));

        assertThat(after.get("blocks")).hasSize(1);
        assertThat(after.get("blocks").get(0).get("id").asLong()).isEqualTo(keepId);
        assertThat(noteBlockRepository.count()).isEqualTo(1);
    }

    @Test
    void omittingBlocksEntirelyLeavesExistingBlocksUntouched() throws Exception {
        long noteId = createNote("Meeting");
        update(noteId, """
                {"title":"Meeting","body":"x","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"paragraph","content":"kept","checked":false}
                ]}
                """);

        // Every pre-existing caller sends no `blocks` field at all; that must be a no-op, not a
        // silent wipe of the note's structured content.
        JsonNode after = update(noteId, """
                {"title":"Meeting renamed","body":"x","contentType":"PLAIN_TEXT"}
                """);

        assertThat(after.get("blocks")).hasSize(1);
        assertThat(after.get("blocks").get(0).get("content").asText()).isEqualTo("kept");
    }

    @Test
    void unknownBlockIdIsRejectedRatherThanSilentlyInserted() throws Exception {
        long noteId = createNote("Meeting");

        mockMvc.perform(put("/api/v1/notes/{id}", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Meeting","body":"x","contentType":"PLAIN_TEXT","blocks":[
                                  {"id":987654,"type":"paragraph","content":"ghost","checked":false}
                                ]}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void anEmptyBodyIsAcceptedSoAFreshPageCanAutosaveBeforeAnythingIsTyped() throws Exception {
        long noteId = createNote("Untitled");

        mockMvc.perform(put("/api/v1/notes/{id}", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Untitled\",\"body\":\"\",\"contentType\":\"PLAIN_TEXT\",\"autosave\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value(""));
    }

    @Test
    void repeatedAutosavesDoNotMintAVersionPerSave() throws Exception {
        long noteId = createNote("Draft");
        long baseline = noteVersionRepository.count();

        // Title changes and >120-character body swings are "major" edits that an explicit save
        // snapshots every time. Under autosave they must fall back to the time debounce instead.
        for (int i = 0; i < 6; i++) {
            update(noteId, """
                    {"title":"Draft %d","body":"%s","contentType":"PLAIN_TEXT","autosave":true}
                    """.formatted(i, "content ".repeat(30 * (i + 1))));
        }

        assertThat(noteVersionRepository.count() - baseline)
                .as("six autosaves inside the debounce window should snapshot at most once")
                .isLessThanOrEqualTo(1);
    }

    @Test
    void anExplicitSaveStillSnapshotsAMajorEditImmediately() throws Exception {
        long noteId = createNote("Draft");
        long baseline = noteVersionRepository.count();

        update(noteId, """
                {"title":"Renamed deliberately","body":"seed","contentType":"PLAIN_TEXT"}
                """);

        assertThat(noteVersionRepository.count() - baseline)
                .as("an explicit save keeps the original major-edit versioning behaviour")
                .isEqualTo(1);
    }

    @Test
    void theSameBlockIdTwiceInOnePayloadIsRejectedRatherThanAppliedTwice() throws Exception {
        long noteId = createNote("Meeting");
        JsonNode seeded = update(noteId, """
                {"title":"Meeting","body":"x","contentType":"PLAIN_TEXT","blocks":[
                  {"type":"paragraph","content":"one","checked":false}
                ]}
                """);
        long blockId = seeded.get("blocks").get(0).get("id").asLong();

        // A client race could otherwise pin one server id onto two client blocks; applying that
        // would update one row twice and strand the other, cascade-deleting its task link.
        mockMvc.perform(put("/api/v1/notes/{id}", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Meeting","body":"x","contentType":"PLAIN_TEXT","blocks":[
                                  {"id":%d,"type":"paragraph","content":"one","checked":false},
                                  {"id":%d,"type":"paragraph","content":"also one","checked":false}
                                ]}
                                """.formatted(blockId, blockId)))
                .andExpect(status().isBadRequest());

        assertThat(noteBlockRepository.count()).isEqualTo(1);
    }

    @Test
    void aTitleOnlyFirstEditCanCreateTheNoteWithAnEmptyDocument() throws Exception {
        // The page editor creates the record on the first edit, which is very often a title before
        // any body exists. That must not 400.
        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Q3 review\",\"body\":\"\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Q3 review"))
                .andExpect(jsonPath("$.body").value(""));
    }

    @Test
    void aMissingBodyIsStillRejectedOnCreate() throws Exception {
        // Relaxing @NotBlank to @NotNull must not turn into "body is optional".
        mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"No body at all\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void repeatedAutosavesDoNotRecordAnActivityEventEachTime() throws Exception {
        long projectId = createProject("Tracker Mobile App");
        String created = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Draft\",\"body\":\"seed\",\"projectId\":" + projectId + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long noteId = objectMapper.readTree(created).get("id").asLong();
        long baseline = projectActivityRepository.count();

        for (int i = 0; i < 6; i++) {
            update(noteId, """
                    {"title":"Draft %d","body":"%s","contentType":"PLAIN_TEXT","projectId":%d,"autosave":true}
                    """.formatted(i, "content ".repeat(30 * (i + 1)), projectId));
        }

        assertThat(projectActivityRepository.count() - baseline)
                .as("autosaves coalesce onto the version-snapshot boundary instead of one event per request")
                .isLessThanOrEqualTo(1);
    }

    @Test
    void anExplicitSaveStillRecordsProjectActivity() throws Exception {
        long projectId = createProject("Tracker Mobile App");
        String created = mockMvc.perform(post("/api/v1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Draft\",\"body\":\"seed\",\"projectId\":" + projectId + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long noteId = objectMapper.readTree(created).get("id").asLong();
        long baseline = projectActivityRepository.count();

        update(noteId, """
                {"title":"Renamed deliberately","body":"seed","contentType":"PLAIN_TEXT","projectId":%d}
                """.formatted(projectId));

        assertThat(projectActivityRepository.count() - baseline).isEqualTo(1);
    }
}
