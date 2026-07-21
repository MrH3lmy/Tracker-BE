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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class NoteSavedViewControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        // TestAuthSupport persists a PREMIUM user, so the free-tier saved-view cap
        // (EntitlementService.assertWithinSavedViewCap) never trips in these tests.
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void createReturns201AndListsIt() throws Exception {
        String body = """
                {"name":"My view","filters":{"status":"DONE"},"sortField":"createdAt","sortDirection":"asc","viewType":"table"}
                """;

        mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("My view"))
                .andExpect(jsonPath("$.filters.status").value("DONE"))
                .andExpect(jsonPath("$.sortField").value("createdAt"))
                .andExpect(jsonPath("$.sortDirection").value("asc"))
                .andExpect(jsonPath("$.viewType").value("table"));

        mockMvc.perform(get("/api/v1/note-saved-views"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='My view')]").exists());
    }

    @Test
    void createWithDefaultsAppliesFallbacks() throws Exception {
        String body = """
                {"name":"Minimal view"}
                """;

        mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sortField").value("updatedAt"))
                .andExpect(jsonPath("$.sortDirection").value("desc"))
                .andExpect(jsonPath("$.viewType").value("list"));
    }

    @Test
    void updateModifiesExistingView() throws Exception {
        long id = createView("Original name");

        String updateBody = """
                {"name":"Renamed view","sortField":"title","sortDirection":"asc","viewType":"sticky"}
                """;
        mockMvc.perform(put("/api/v1/note-saved-views/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) id))
                .andExpect(jsonPath("$.name").value("Renamed view"))
                .andExpect(jsonPath("$.sortField").value("title"))
                .andExpect(jsonPath("$.viewType").value("sticky"));
    }

    @Test
    void deleteRemovesView() throws Exception {
        long id = createView("Temp view");

        mockMvc.perform(delete("/api/v1/note-saved-views/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/note-saved-views"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==" + id + ")]").doesNotExist());
    }

    @Test
    void createWithBlankNameReturns400WithStandardErrorShape() throws Exception {
        String body = """
                {"name":""}
                """;

        mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/note-saved-views"));
    }

    @Test
    void createWithUnsupportedSortFieldReturns400() throws Exception {
        String body = """
                {"name":"Bad sort field","sortField":"not-a-real-field"}
                """;

        mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("sortField")));
    }

    @Test
    void createWithUnsupportedViewTypeReturns400() throws Exception {
        String body = """
                {"name":"Bad view type","viewType":"not-a-real-view"}
                """;

        mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("viewType")));
    }

    @Test
    void updateUnknownIdReturns404() throws Exception {
        String body = """
                {"name":"Doesn't matter"}
                """;
        mockMvc.perform(put("/api/v1/note-saved-views/{id}", 999_999L)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void deleteUnknownIdReturns404() throws Exception {
        mockMvc.perform(delete("/api/v1/note-saved-views/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void updateAnotherUsersViewReturns404() throws Exception {
        long id = createView("Owned by first user");

        // Switch the security context to a second, unrelated user - the saved view is scoped
        // by userId (NoteSavedViewService.findOwned), so it must look not-found to them too.
        TestAuthSupport.loginAsNewUser(userRepository);

        String updateBody = """
                {"name":"Hijacked"}
                """;
        mockMvc.perform(put("/api/v1/note-saved-views/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isNotFound());
    }

    private long createView(String name) throws Exception {
        String body = """
                {"name":"%s"}
                """.formatted(name);
        String response = mockMvc.perform(post("/api/v1/note-saved-views").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(response).get("id").asLong();
    }
}
