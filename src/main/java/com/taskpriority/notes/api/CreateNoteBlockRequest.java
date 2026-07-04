package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotBlank;

public record CreateNoteBlockRequest(
        @NotBlank String type,
        String content,
        Integer position,
        Boolean checked,
        String metadata
) {}
