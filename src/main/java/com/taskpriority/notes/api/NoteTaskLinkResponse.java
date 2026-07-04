package com.taskpriority.notes.api;

import java.time.LocalDateTime;

public record NoteTaskLinkResponse(
        Long id,
        Long noteId,
        Long blockId,
        Long taskId,
        String taskTitle,
        String selectedText,
        LocalDateTime createdAt
) {}
