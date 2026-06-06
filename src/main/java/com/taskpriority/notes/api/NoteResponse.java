package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;

import java.time.LocalDateTime;

public record NoteResponse(
        Long id,
        String title,
        String body,
        NoteContentType contentType,
        Long taskId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
