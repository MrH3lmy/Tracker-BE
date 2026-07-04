package com.taskpriority.notes.api;

import java.time.LocalDateTime;

public record NoteBlockResponse(
        Long id,
        Long noteId,
        String type,
        String content,
        Integer position,
        Boolean checked,
        String metadata,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        java.util.List<NoteTaskLinkResponse> taskLinks
) {}
