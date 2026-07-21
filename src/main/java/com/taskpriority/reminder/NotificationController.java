package com.taskpriority.reminder;

import com.taskpriority.common.exception.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Reminder notifications: listing, unread count, read state, and snoozing")
public class NotificationController {
    private final ReminderService reminderService;
    private final NotificationApiMapper mapper;

    public NotificationController(ReminderService reminderService, NotificationApiMapper mapper) {
        this.reminderService = reminderService;
        this.mapper = mapper;
    }

    @Operation(summary = "List notifications", description = "Optionally filter to unread notifications only.")
    @GetMapping
    public List<NotificationResponse> all(@RequestParam(name = "unreadOnly", defaultValue = "false") boolean unreadOnly) {
        return reminderService.findAll(unreadOnly).stream().map(mapper::toResponse).toList();
    }

    @Operation(summary = "Get the unread notification count")
    @ApiResponse(responseCode = "200", description = "Unread count", content = @Content(schema = @Schema(type = "object")))
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", reminderService.countUnread());
    }

    @Operation(summary = "Mark a notification as read")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Notification marked read"),
            @ApiResponse(responseCode = "404", description = "Notification not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id) {
        return mapper.toResponse(reminderService.markRead(id));
    }

    @Operation(summary = "Snooze a notification", description = "Reschedules the notification to fire again at the given time.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Notification snoozed"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Notification not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/snooze")
    public NotificationResponse snooze(@PathVariable Long id, @Validated @RequestBody SnoozeNotificationRequest request) {
        return mapper.toResponse(reminderService.snooze(id, request.scheduledFor()));
    }
}
