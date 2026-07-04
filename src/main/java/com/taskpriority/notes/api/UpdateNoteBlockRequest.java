package com.taskpriority.notes.api;

public record UpdateNoteBlockRequest(
        String type,
        String content,
        Integer position,
        Boolean checked,
        String metadata
) {}
