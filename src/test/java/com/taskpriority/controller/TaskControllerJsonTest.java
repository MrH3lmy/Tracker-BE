package com.taskpriority.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.Status;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
class TaskControllerJsonTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskService taskService;

    @MockBean
    private TaskApiMapper taskApiMapper;

    @Test
    void createTaskReturnsTaskResponseShape() throws Exception {
        var requestJson = """
                {
                  "title":"Write release notes",
                  "description":"for sprint 15",
                  "dueDate":"2026-06-01",
                  "important":true,
                  "status":"BACKLOG",
                  "area":"WORK",
                  "effort":"MEDIUM"
                }
                """;

        var response = new com.taskpriority.task.api.TaskResponse(
                7L, "Write release notes", "for sprint 15", LocalDate.parse("2026-06-01"),
                null, null, true, Status.BACKLOG, Area.WORK, Effort.MEDIUM,
                null, null, null, null, false, false, 50, com.taskpriority.model.PriorityCategory.SCHEDULE, null, null, 1L, 1000
        );

        when(taskApiMapper.fromCreateRequest(any())).thenReturn(new com.taskpriority.model.Task());
        when(taskService.save(any())).thenReturn(new com.taskpriority.model.Task());
        when(taskApiMapper.toResponse(any())).thenReturn(response);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.title").value("Write release notes"))
                .andExpect(jsonPath("$.important").value(true))
                .andExpect(jsonPath("$.status").value("BACKLOG"))
                .andExpect(jsonPath("$.priorityScore").value(50))
                .andExpect(jsonPath("$.priorityCategory").value("SCHEDULE"));
    }

    @Test
    void updateTaskAcceptsUpdateDtoAndReturnsTaskResponseShape() throws Exception {
        var response = new com.taskpriority.task.api.TaskResponse(
                9L, "Refine API", "DTO alignment", LocalDate.parse("2026-06-02"),
                null, null, false, Status.IN_PROGRESS, Area.WORK, Effort.DEEP_WORK,
                null, null, null, null, false, false, 10, com.taskpriority.model.PriorityCategory.DO_NOW, null, null, 3L, 2000
        );

        when(taskService.updateTask(any(), any())).thenReturn(new com.taskpriority.model.Task());
        when(taskApiMapper.toResponse(any())).thenReturn(response);

        var payload = objectMapper.writeValueAsString(new java.util.LinkedHashMap<String, Object>() {{
            put("title", "Refine API");
            put("description", "DTO alignment");
            put("important", false);
            put("status", "IN_PROGRESS");
            put("area", "WORK");
            put("effort", "DEEP_WORK");
        }});

        mockMvc.perform(put("/api/tasks/9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.title").value("Refine API"))
                .andExpect(jsonPath("$.description").value("DTO alignment"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }
}
