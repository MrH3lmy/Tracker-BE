package com.taskpriority.notes.api;

import java.time.LocalDateTime;

public record NoteCollectionResponse(
        Long id,
        String name,
        String description,
        String color,
        String icon,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
