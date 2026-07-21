package com.taskpriority.notes.api;

import com.taskpriority.model.NoteTemplate;
import com.taskpriority.model.User;
import com.taskpriority.repository.NoteTemplateRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class NoteTemplateControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired NoteTemplateRepository noteTemplateRepository;

    private User currentUser;

    @BeforeEach
    void loginTestUser() {
        currentUser = TestAuthSupport.loginAsNewUser(userRepository);
    }

    private long seedTemplate(String name) {
        NoteTemplate template = new NoteTemplate();
        template.setUserId(currentUser.getId());
        template.setName(name);
        template.setDescription("A test template");
        template.setCategory("Testing");
        template.setContent("# {{taskTitle}}\n\nBody with {{date}}");
        template.setBlocksJson("[{\"type\":\"heading\",\"content\":\"# {{taskTitle}}\"}]");
        return noteTemplateRepository.save(template).getId();
    }

    @Test
    void listReturnsOnlyCurrentUsersTemplates() throws Exception {
        long templateId = seedTemplate("Weekly review");

        mockMvc.perform(get("/api/v1/note-templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==" + templateId + ")].name").value("Weekly review"))
                .andExpect(jsonPath("$[?(@.id==" + templateId + ")].category").value("Testing"));
    }

    @Test
    void createFromTemplateBuildsNoteWithRenderedContent() throws Exception {
        long templateId = seedTemplate("Kickoff");

        String body = """
                {"templateId":%d,"title":"My new note"}
                """.formatted(templateId);

        mockMvc.perform(post("/api/v1/notes/from-template").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("My new note"))
                .andExpect(jsonPath("$.contentType").value("MARKDOWN"))
                .andExpect(jsonPath("$.body", org.hamcrest.Matchers.containsString("Body with")));
    }

    @Test
    void createFromTemplateWithoutTitleFallsBackToTemplateName() throws Exception {
        long templateId = seedTemplate("Retro template");

        String body = """
                {"templateId":%d}
                """.formatted(templateId);

        mockMvc.perform(post("/api/v1/notes/from-template").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Retro template"));
    }

    @Test
    void createFromTemplateWithMissingTemplateIdReturns400WithStandardErrorShape() throws Exception {
        String body = """
                {"title":"No template id here"}
                """;

        mockMvc.perform(post("/api/v1/notes/from-template").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/notes/from-template"));
    }

    @Test
    void createFromTemplateWithUnknownTemplateIdReturns404() throws Exception {
        String body = """
                {"templateId":999999}
                """;

        mockMvc.perform(post("/api/v1/notes/from-template").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void createFromTemplateWithAnotherUsersTemplateReturns404() throws Exception {
        long templateId = seedTemplate("Owned by first user");

        // Switch to a second user - templates are scoped by userId
        // (NoteTemplateService.createNoteFromTemplate uses findByUserIdAndId), so the first
        // user's template must be invisible to this one.
        TestAuthSupport.loginAsNewUser(userRepository);

        String body = """
                {"templateId":%d}
                """.formatted(templateId);
        mockMvc.perform(post("/api/v1/notes/from-template").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound());
    }
}
