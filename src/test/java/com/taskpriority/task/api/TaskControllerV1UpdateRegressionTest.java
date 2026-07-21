package com.taskpriority.task.api;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class TaskControllerV1UpdateRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void cleanDatabase() {
        taskRepository.deleteAll();
        testUser = TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void updatePreservesServerOwnedTimestampsAndDeletedFlag() throws Exception {
        LocalDateTime createdDate = LocalDateTime.of(2026, 5, 1, 9, 30);
        LocalDateTime completedDate = LocalDateTime.of(2026, 5, 2, 10, 45);
        Task existing = new Task("Original title");
        existing.setUserId(testUser.getId());
        existing.setCreatedDate(createdDate);
        existing.setCompletedDate(completedDate);
        existing.setDeleted(true);
        existing.setStatus(Status.DONE);
        Task saved = taskRepository.saveAndFlush(existing);

        String payload = """
                {
                  "title": "Updated title",
                  "description": "Updated description",
                  "important": true,
                  "status": "BACKLOG"
                }
                """;

        mockMvc.perform(put("/api/v1/tasks/{id}", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        Task updated = taskRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.getTitle()).isEqualTo("Updated title");
        assertThat(updated.getDescription()).isEqualTo("Updated description");
        assertThat(updated.getCreatedDate()).isEqualTo(createdDate);
        assertThat(updated.getCompletedDate()).isEqualTo(completedDate);
        assertThat(updated.isDeleted()).isTrue();
    }

    @Test
    void updateDueDateChangesOnlyTheDueDate() throws Exception {
        Task existing = new Task("Drag me on the month grid");
        existing.setUserId(testUser.getId());
        existing.setDueDate(LocalDate.of(2026, 7, 10));
        Task saved = taskRepository.saveAndFlush(existing);

        mockMvc.perform(patch("/api/v1/tasks/{id}/due-date", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"2026-07-22\"}"))
                .andExpect(status().isOk());

        Task updated = taskRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.getDueDate()).isEqualTo(LocalDate.of(2026, 7, 22));
        assertThat(updated.getTitle()).isEqualTo("Drag me on the month grid");
    }
}
