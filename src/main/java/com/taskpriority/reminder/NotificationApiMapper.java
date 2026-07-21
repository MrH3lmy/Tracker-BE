package com.taskpriority.reminder;

import com.taskpriority.model.NotificationOutboxEntry;
import org.springframework.stereotype.Component;

@Component
public class NotificationApiMapper {

    public NotificationResponse toResponse(NotificationOutboxEntry entry) {
        return new NotificationResponse(
                entry.getId(),
                entry.getTitle(),
                entry.getBody(),
                entry.getLink(),
                entry.isRead(),
                entry.getCreatedDate()
        );
    }
}
