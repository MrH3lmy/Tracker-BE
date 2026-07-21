package com.taskpriority.reminder;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final ReminderService reminderService;
    private final NotificationApiMapper mapper;

    public NotificationController(ReminderService reminderService, NotificationApiMapper mapper) {
        this.reminderService = reminderService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<NotificationResponse> all(@RequestParam(name = "unreadOnly", defaultValue = "false") boolean unreadOnly) {
        return reminderService.findAll(unreadOnly).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", reminderService.countUnread());
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id) {
        return mapper.toResponse(reminderService.markRead(id));
    }

    @PatchMapping("/{id}/snooze")
    public NotificationResponse snooze(@PathVariable Long id, @Validated @RequestBody SnoozeNotificationRequest request) {
        return mapper.toResponse(reminderService.snooze(id, request.scheduledFor()));
    }
}
