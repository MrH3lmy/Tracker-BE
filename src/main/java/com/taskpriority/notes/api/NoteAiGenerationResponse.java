package com.taskpriority.notes.api;

import com.taskpriority.model.NoteAiAction;
import java.time.LocalDateTime;

public record NoteAiGenerationResponse(
        Long id,
        Long noteId,
        NoteAiAction action,
        String provider,
        String model,
        String generatedContent,
        String sourceHash,
        boolean generated,
        boolean applied,
        String auditMetadata,
        LocalDateTime createdAt
) {}
