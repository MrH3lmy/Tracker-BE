package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.json.JsonMapper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class NoteCollectionControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void createReturns201AndListsIt() throws Exception {
        String body = """
                {"name":"Work","description":"Work-related notes","color":"#ff0000","icon":"briefcase"}
                """;

        mockMvc.perform(post("/api/v1/note-collections").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Work"))
                .andExpect(jsonPath("$.description").value("Work-related notes"))
                .andExpect(jsonPath("$.color").value("#ff0000"))
                .andExpect(jsonPath("$.icon").value("briefcase"));

        mockMvc.perform(get("/api/v1/note-collections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='Work')]").exists());
    }

    @Test
    void updateModifiesExistingCollection() throws Exception {
        long id = createCollection("Personal");

        String updateBody = """
                {"name":"Personal (updated)","description":"desc","color":"#00ff00","icon":"home"}
                """;
        mockMvc.perform(patch("/api/v1/note-collections/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) id))
                .andExpect(jsonPath("$.name").value("Personal (updated)"))
                .andExpect(jsonPath("$.color").value("#00ff00"));
    }

    @Test
    void deleteRemovesCollection() throws Exception {
        long id = createCollection("Temp collection");

        mockMvc.perform(delete("/api/v1/note-collections/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/note-collections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==" + id + ")]").doesNotExist());
    }

    @Test
    void createWithBlankNameReturns400WithStandardErrorShape() throws Exception {
        String body = """
                {"name":"","description":"no name"}
                """;

        mockMvc.perform(post("/api/v1/note-collections").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/note-collections"));
    }

    @Test
    void updateUnknownIdReturns404() throws Exception {
        String body = """
                {"name":"Doesn't matter"}
                """;
        mockMvc.perform(patch("/api/v1/note-collections/{id}", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void deleteUnknownIdReturns404() throws Exception {
        mockMvc.perform(delete("/api/v1/note-collections/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    private long createCollection(String name) throws Exception {
        String body = """
                {"name":"%s"}
                """.formatted(name);
        String response = mockMvc.perform(post("/api/v1/note-collections").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
