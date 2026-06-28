package com.taskpriority.task.api;

import com.taskpriority.model.NoteAttachmentKind;

import java.time.LocalDateTime;

public record TaskScreenshotResponse(
        Long id,
        Long noteId,
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
