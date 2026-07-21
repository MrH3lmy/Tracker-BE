package com.taskpriority.reminder;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String title,
        String body,
        String link,
        boolean read,
        LocalDateTime createdDate
) {}
