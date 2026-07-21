package com.taskpriority.reminder;

import com.taskpriority.model.NotificationOutboxEntry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReminderService reminderService;

    @MockBean
    private NotificationApiMapper mapper;

    private NotificationOutboxEntry entry() {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setId(1L);
        entry.setTitle("Task due today");
        entry.setBody("Write report");
        entry.setRead(false);
        entry.setCreatedDate(LocalDateTime.now());
        return entry;
    }

    @Test
    void allReturnsNotificationsForTheCurrentUser() throws Exception {
        when(reminderService.findAll(anyBoolean())).thenReturn(List.of(entry()));
        when(mapper.toResponse(any())).thenReturn(new NotificationResponse(1L, "Task due today", "Write report", "/tasks/1", false, LocalDateTime.now()));

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Task due today"));
    }

    @Test
    void unreadCountReturnsCount() throws Exception {
        when(reminderService.countUnread()).thenReturn(3L);

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3));
    }

    @Test
    void markReadReturnsUpdatedNotification() throws Exception {
        when(reminderService.markRead(1L)).thenReturn(entry());
        when(mapper.toResponse(any())).thenReturn(new NotificationResponse(1L, "Task due today", "Write report", null, true, LocalDateTime.now()));

        mockMvc.perform(patch("/api/v1/notifications/1/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
    }

    @Test
    void snoozeRejectsAPastScheduledFor() throws Exception {
        mockMvc.perform(patch("/api/v1/notifications/1/snooze")
                        .contentType("application/json")
                        .content("{\"scheduledFor\":\"2020-01-01T09:00:00\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void snoozeReturnsOkForAFutureTime() throws Exception {
        when(reminderService.snooze(any(), any())).thenReturn(entry());
        when(mapper.toResponse(any())).thenReturn(new NotificationResponse(1L, "Task due today", "Write report", null, true, LocalDateTime.now()));

        mockMvc.perform(patch("/api/v1/notifications/1/snooze")
                        .contentType("application/json")
                        .content("{\"scheduledFor\":\"2099-01-01T09:00:00\"}"))
                .andExpect(status().isOk());
    }
}
