package com.taskpriority.notes;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.Project;
import com.taskpriority.model.User;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.repository.ProjectRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Coverage for issue #287's meeting-note action-item -> task workflow: traceability
 * (Task.sourceNoteId), project inheritance from the note, idempotent duplicate protection for a
 * specific action-item block, and cross-user rejection. The existing free-text/no-block
 * conversion path is also covered to prove it's unchanged (still creates a new task per call).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class NoteTaskConversionIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired NoteRepository noteRepository;
    @Autowired NoteBlockRepository noteBlockRepository;
    @Autowired NoteTaskLinkRepository noteTaskLinkRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ProjectRepository projectRepository;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);
    }

    private Note saveNote(String title, Long projectId) {
        Note note = new Note(title);
        note.setUserId(alice.getId());
        note.setBody("Standup notes");
        note.setProjectId(projectId);
        return noteRepository.save(note);
    }

    private NoteBlock saveBlock(Note note, String content) {
        NoteBlock block = new NoteBlock();
        block.setUserId(alice.getId());
        block.setNote(note);
        block.setType("checklist_item");
        block.setContent(content);
        return noteBlockRepository.save(block);
    }

    private JsonNode convert(Long noteId, String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", noteId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void conversionSetsSourceNoteIdForTraceability() throws Exception {
        Note note = saveNote("Weekly sync", null);

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", note.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Confirm API contract\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.task.sourceNoteId").value(note.getId()));
    }

    @Test
    void conversionInheritsNotesProject() throws Exception {
        Project project = new Project("Platform");
        project.setUserId(alice.getId());
        Long projectId = projectRepository.save(project).getId();
        Note note = saveNote("Kickoff", projectId);

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", note.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Draft charter\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.task.projectId").value(projectId.intValue()));
    }

    @Test
    void duplicateActionItemConversionReturnsSameTaskInsteadOfCreatingAnother() throws Exception {
        Note note = saveNote("Meeting note", null);
        NoteBlock block = saveBlock(note, "Confirm API contract with mobile team");
        String body = objectMapper.writeValueAsString(java.util.Map.of("noteBlockId", block.getId()));

        JsonNode first = convert(note.getId(), body);
        JsonNode second = convert(note.getId(), body);

        assertThat(first.get("task").get("id").asLong()).isEqualTo(second.get("task").get("id").asLong());
        assertThat(first.get("link").get("id").asLong()).isEqualTo(second.get("link").get("id").asLong());
        assertThat(noteTaskLinkRepository.findByUserIdAndNoteBlockId(alice.getId(), block.getId())).hasSize(1);
    }

    @Test
    void freeTextConversionWithoutBlockIdIsUnchangedAndCreatesANewTaskEachCall() throws Exception {
        Note note = saveNote("Scratch note", null);
        String body = "{\"title\":\"Ad-hoc task\"}";

        JsonNode first = convert(note.getId(), body);
        JsonNode second = convert(note.getId(), body);

        assertThat(first.get("task").get("id").asLong()).isNotEqualTo(second.get("task").get("id").asLong());
    }

    @Test
    void conversionForAnotherUsersNoteReturns404() throws Exception {
        Note aliceNote = saveNote("Alice's note", null);
        TestAuthSupport.loginAsNewUser(userRepository); // switch to Bob

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", aliceNote.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Sneaky task\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void conversionWithAnotherUsersBlockIdReturns404() throws Exception {
        Note aliceNote = saveNote("Alice's note", null);
        NoteBlock aliceBlock = saveBlock(aliceNote, "Alice's action item");

        User bob = TestAuthSupport.loginAsNewUser(userRepository);
        Note bobNote = new Note("Bob's note");
        bobNote.setUserId(bob.getId());
        bobNote.setBody("Bob's body");
        Note savedBobNote = noteRepository.save(bobNote);

        String body = objectMapper.writeValueAsString(java.util.Map.of("noteBlockId", aliceBlock.getId()));

        mockMvc.perform(post("/api/v1/notes/{id}/convert-selection-to-task", savedBobNote.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }
}
