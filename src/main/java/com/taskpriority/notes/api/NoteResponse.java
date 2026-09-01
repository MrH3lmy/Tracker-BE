package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.NoteType;

import java.time.LocalDateTime;
import java.util.List;

public record NoteResponse(
        Long id,
        String title,
        String body,
        NoteContentType contentType,
        Long taskId,
        Long collectionId,
        String collectionName,
        Long projectId,
        NoteType noteType,
        Integer displayOrder,
        Integer positionX,
        Integer positionY,
        Integer width,
        Integer height,
        String color,
        Integer zIndex,
        List<String> tags,
        List<NoteAttachmentResponse> attachments,
        List<NoteTaskLinkResponse> taskLinks,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
