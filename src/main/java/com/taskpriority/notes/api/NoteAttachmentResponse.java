package com.taskpriority.notes.api;

import com.taskpriority.model.NoteAttachmentKind;

import java.time.LocalDateTime;

public record NoteAttachmentResponse(
        Long id,
        String fileName,
        String contentType,
        Long sizeBytes,
        NoteAttachmentKind kind,
        String caption,
        String source,
        Integer width,
        Integer height,
        String downloadUrl,
        LocalDateTime createdAt
) {
}
