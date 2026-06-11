package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;

import java.time.LocalDateTime;
import java.util.List;

public record NoteResponse(
        Long id,
        String title,
        String body,
        NoteContentType contentType,
        Long taskId,
        List<String> tags,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
