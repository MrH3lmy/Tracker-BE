package com.taskpriority.notes.api;

import com.taskpriority.model.NoteAttachmentKind;

import java.time.LocalDateTime;

public record NoteAttachmentResponse(
        Long id,
        String fileName,
        String contentType,
        Long sizeBytes,
        NoteAttachmentKind kind,
        LocalDateTime createdAt
) {
}
