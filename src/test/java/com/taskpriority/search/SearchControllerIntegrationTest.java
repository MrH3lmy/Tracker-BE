package com.taskpriority.search;

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

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SearchController has no single-resource-by-id lookup, so there is no reachable 404 case. The
 * page/size params are the only binding-typed inputs, so a non-numeric value for either is the
 * 400 case (MethodArgumentTypeMismatchException). The q/type/status/due/area/tag filters are all
 * plain optional Strings that SearchService treats permissively (an unrecognized type/status/
 * area/due value simply matches nothing, per SearchService.includesType/matchesDueFilter) rather
 * than raising an error, so those are exercised as filtering/pagination behavior, not 400s.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class SearchControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void rejectsNonNumericPageWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "task").param("page", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("page")));
    }

    @Test
    void rejectsNonNumericSizeWithBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "task").param("size", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void filtersResultsByTypeAcrossTasksAndHabits() throws Exception {
        createTask("""
                {"title":"Shared keyword task","description":"d","area":"WORK"}
                """);
        createHabit("Shared keyword habit");

        mockMvc.perform(get("/api/v1/search").param("q", "Shared keyword").param("type", "task"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].type", everyItem(org.hamcrest.Matchers.is("TASK"))))
                .andExpect(jsonPath("$.items[*].title", hasItem("Shared keyword task")));

        mockMvc.perform(get("/api/v1/search").param("q", "Shared keyword").param("type", "habit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].type", everyItem(org.hamcrest.Matchers.is("HABIT"))))
                .andExpect(jsonPath("$.items[*].title", hasItem("Shared keyword habit")));
    }

    @Test
    void unrecognizedTypeFilterReturnsNoResultsInsteadOfError() throws Exception {
        createTask("""
                {"title":"Findable by default","description":"d","area":"WORK"}
                """);

        mockMvc.perform(get("/api/v1/search").param("q", "Findable").param("type", "not-a-real-type"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void pageSizeIsClampedToMaximumAllowed() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "").param("size", "5000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));
    }

    @Test
    void negativePageNumberFallsBackToFirstPage() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "").param("page", "-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0));
    }

    private long createTask(String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return com.fasterxml.jackson.databind.json.JsonMapper.builder().build().readTree(response).get("id").asLong();
    }

    private long createHabit(String title) throws Exception {
        String response = mockMvc.perform(post("/api/v1/habits").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","area":"HEALTH","important":false,"reminderEnabled":false,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """.formatted(title)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return com.fasterxml.jackson.databind.json.JsonMapper.builder().build().readTree(response).get("id").asLong();
    }
}
