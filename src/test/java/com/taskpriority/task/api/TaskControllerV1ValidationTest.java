package com.taskpriority.task.api;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Task;
import com.taskpriority.notes.NoteService;
import com.taskpriority.service.TaskService;
import com.taskpriority.service.BlockerAnalysisService;
import com.taskpriority.task.application.DuplicateDetectionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskControllerV1.class)
class TaskControllerV1ValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskService taskService;

    @MockBean
    private TaskApiMapper mapper;

    @MockBean
    private DuplicateDetectionService duplicateDetectionService;

    @MockBean
    private BlockerAnalysisService blockerAnalysisService;

    @MockBean
    private NoteService noteService;

    @Test
    void createReturnsBadRequestWithStandardizedErrorWhenTitleMissing() throws Exception {
        mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"d\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("title is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/tasks"));
    }

    @Test
    void createReturnsBadRequestWhenBlockedGuidanceMissing() throws Exception {
        String payload = """
                {"title":"Blocked task","status":"BLOCKED"}
                """;

        mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("blockedReason is recommended")));
    }

    @Test
    void byIdReturnsNotFoundWithStandardizedErrorWhenTaskMissing() throws Exception {
        when(taskService.findById(999L)).thenThrow(new ResourceNotFoundException("Task with id 999 not found"));

        mockMvc.perform(get("/api/v1/tasks/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Task with id 999 not found"))
                .andExpect(jsonPath("$.path").value("/api/v1/tasks/999"));
    }
}
