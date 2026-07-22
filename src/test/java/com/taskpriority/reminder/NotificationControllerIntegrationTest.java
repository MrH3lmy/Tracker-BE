package com.taskpriority.reminder;

import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;
import com.taskpriority.model.Reminder;
import com.taskpriority.model.ReminderKind;
import com.taskpriority.model.ReminderStatus;
import com.taskpriority.repository.NotificationOutboxRepository;
import com.taskpriority.repository.ReminderRepository;
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

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for NotificationController against H2, exercising the actual
 * ReminderService/NotificationOutboxRepository stack, unlike NotificationControllerTest which
 * mocks the service. There is no REST endpoint that creates a notification (they're produced by
 * ReminderService's scheduled outbox jobs), so test setup persists NotificationOutboxEntry /
 * Reminder rows directly via their repositories, both of which already exist in production code.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class NotificationControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired NotificationOutboxRepository notificationOutboxRepository;
    @Autowired ReminderRepository reminderRepository;

    private Long userId;

    @BeforeEach
    void loginTestUser() {
        userId = TestAuthSupport.loginAsNewUser(userRepository).getId();
    }

    private Reminder persistReminder(Long ownerUserId) {
        Reminder reminder = new Reminder();
        reminder.setUserId(ownerUserId);
        reminder.setKind(ReminderKind.TASK_DUE);
        reminder.setScheduledFor(LocalDateTime.now());
        reminder.setStatus(ReminderStatus.SENT);
        reminder.setIdempotencyKey("test-" + java.util.UUID.randomUUID());
        return reminderRepository.save(reminder);
    }

    private NotificationOutboxEntry persistNotification(Long ownerUserId, Reminder reminder, String title, boolean read) {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setUserId(ownerUserId);
        entry.setReminderId(reminder.getId());
        entry.setChannel(NotificationChannel.IN_APP);
        entry.setTitle(title);
        entry.setBody("Write report");
        entry.setLink("/tasks/1");
        entry.setStatus(NotificationStatus.PENDING);
        entry.setRead(read);
        return notificationOutboxRepository.save(entry);
    }

    @Test
    void allReturnsRealPersistedNotificationsForCurrentUser() throws Exception {
        persistNotification(userId, persistReminder(userId), "Task due today", false);
        persistNotification(userId, persistReminder(userId), "Follow-up due", true);

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(get("/api/v1/notifications").param("unreadOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Task due today"));
    }

    @Test
    void unreadCountReflectsRealData() throws Exception {
        persistNotification(userId, persistReminder(userId), "Task due today", false);
        persistNotification(userId, persistReminder(userId), "Follow-up due", false);
        persistNotification(userId, persistReminder(userId), "Already read", true);

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));
    }

    @Test
    void markReadPersistsAndExcludesFromUnreadOnlyListing() throws Exception {
        NotificationOutboxEntry entry = persistNotification(userId, persistReminder(userId), "Task due today", false);

        mockMvc.perform(patch("/api/v1/notifications/{id}/read", entry.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(entry.getId().intValue()))
                .andExpect(jsonPath("$.read").value(true));

        mockMvc.perform(get("/api/v1/notifications").param("unreadOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void snoozeMarksReadAndSchedulesANewReminder() throws Exception {
        Reminder reminder = persistReminder(userId);
        NotificationOutboxEntry entry = persistNotification(userId, reminder, "Task due today", false);
        long remindersBefore = reminderRepository.count();

        mockMvc.perform(patch("/api/v1/notifications/{id}/snooze", entry.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduledFor\":\"2099-01-01T09:00:00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        assertReminderStatus(reminder.getId(), ReminderStatus.SNOOZED);
        org.junit.jupiter.api.Assertions.assertEquals(remindersBefore + 1, reminderRepository.count());
    }

    private void assertReminderStatus(Long reminderId, ReminderStatus expected) {
        Reminder reloaded = reminderRepository.findById(reminderId).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(expected, reloaded.getStatus());
    }

    @Test
    void snoozeRejectsAPastScheduledForWithApiErrorShape() throws Exception {
        NotificationOutboxEntry entry = persistNotification(userId, persistReminder(userId), "Task due today", false);

        mockMvc.perform(patch("/api/v1/notifications/{id}/snooze", entry.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduledFor\":\"2020-01-01T09:00:00\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("future")))
                .andExpect(jsonPath("$.path").value("/api/v1/notifications/" + entry.getId() + "/snooze"));
    }

    @Test
    void markReadReturnsNotFoundForMissingNotification() throws Exception {
        mockMvc.perform(patch("/api/v1/notifications/{id}/read", 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void notificationsAreIsolatedPerUser() throws Exception {
        NotificationOutboxEntry entry = persistNotification(userId, persistReminder(userId), "My notification", false);

        TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(patch("/api/v1/notifications/{id}/read", entry.getId()))
                .andExpect(status().isNotFound());
    }
}
