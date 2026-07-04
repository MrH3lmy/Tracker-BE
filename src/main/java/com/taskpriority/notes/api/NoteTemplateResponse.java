package com.taskpriority.notes.api;

import java.time.LocalDateTime;

public record NoteTemplateResponse(
        Long id,
        String name,
        String description,
        String category,
        String content,
        String blocksJson,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
