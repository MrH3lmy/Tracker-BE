package com.taskpriority.project;

import com.taskpriority.model.ActivityEntityType;
import com.taskpriority.model.ActivityEventType;

import java.time.LocalDateTime;
import java.util.Map;

public record ProjectActivityResponse(
        Long id,
        Long projectId,
        Long actorUserId,
        ActivityEventType eventType,
        ActivityEntityType entityType,
        Long entityId,
        String summary,
        Map<String, Object> metadata,
        LocalDateTime occurredAt
) {
}
