package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;

import java.time.LocalDateTime;
import java.util.List;

public record NoteVersionResponse(
        Long id,
        Long noteId,
        String title,
        String body,
        NoteContentType contentType,
        String blocksJson,
        List<String> tags,
        String editorMetadata,
        String createdBy,
        LocalDateTime createdAt
) {
}
