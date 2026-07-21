package com.taskpriority.task.api;

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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ImportController takes the raw request body as a plain String (@RequestBody String csv) for
 * both endpoints, so there is no JSON/type binding to fail and no single-resource-by-id lookup
 * -- there is no reachable 400 or 404 case here. ImportService.importTasksCsv reports malformed
 * rows/headers as validationErrors inside a 200 response rather than throwing, so that
 * per-row-validation behavior (untested by ApiV1IntegrationTest's single-good-row case) is what
 * this class covers instead.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class ImportControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void loginTestUser() {
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void tasksImportReportsHeaderMismatchAsValidationErrorNotHttpError() throws Exception {
        mockMvc.perform(post("/api/v1/import/tasks").contentType(MediaType.TEXT_PLAIN)
                        .content("title,description\nOnly two columns,d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(0))
                .andExpect(jsonPath("$.skippedCount").value(0))
                .andExpect(jsonPath("$.validationErrors[0]").value(containsString("CSV columns must exactly match")));
    }

    @Test
    void tasksImportReportsMissingHeaderAsValidationError() throws Exception {
        // A truly empty body (Content-Length: 0) is treated by Spring as a missing @RequestBody
        // and never reaches the controller (surfaces as 500) - a single blank line is the
        // smallest non-empty payload that actually exercises ImportService's own
        // "header is required" branch.
        mockMvc.perform(post("/api/v1/import/tasks").contentType(MediaType.TEXT_PLAIN).content(" "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(0))
                .andExpect(jsonPath("$.validationErrors[0]").value(containsString("CSV header is required")));
    }

    @Test
    void tasksImportSkipsRowsWithInvalidEnumValuesButImportsValidOnes() throws Exception {
        String csv = """
                title,description,dueDate,status,important,area,effort
                Valid task,desc,2026-05-01,BACKLOG,true,WORK,MEDIUM
                Bad status task,desc,2026-05-01,NOT_A_STATUS,true,WORK,MEDIUM
                Bad area task,desc,2026-05-01,BACKLOG,true,NOT_AN_AREA,MEDIUM
                ,desc,2026-05-01,BACKLOG,true,WORK,MEDIUM
                """;

        mockMvc.perform(post("/api/v1/import/tasks").contentType(MediaType.TEXT_PLAIN).content(csv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1))
                .andExpect(jsonPath("$.skippedCount").value(3))
                .andExpect(jsonPath("$.validationErrors.length()").value(3));

        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", hasItem("Valid task")))
                .andExpect(jsonPath("$[*].title", org.hamcrest.Matchers.not(hasItem("Bad status task"))));
    }

    @Test
    void tasksImportSkipsRowWithWrongColumnCount() throws Exception {
        String csv = """
                title,description,dueDate,status,important,area,effort
                Too few columns,desc,2026-05-01
                """;

        mockMvc.perform(post("/api/v1/import/tasks").contentType(MediaType.TEXT_PLAIN).content(csv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(0))
                .andExpect(jsonPath("$.skippedCount").value(1))
                .andExpect(jsonPath("$.validationErrors[0]").value(containsString("invalid column count")));
    }

    @Test
    void csvImportSkipsBlankLinesAndHeaderRowButImportsEachRemainingLine() throws Exception {
        String csv = "title\n\nFirst imported\nSecond imported\n";

        String response = mockMvc.perform(post("/api/v1/import/csv").contentType(MediaType.TEXT_PLAIN).content(csv))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(response.trim()).isEqualTo("2");

        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(jsonPath("$[*].title", hasItem("First imported")))
                .andExpect(jsonPath("$[*].title", hasItem("Second imported")));
    }
}
