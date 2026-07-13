package com.taskpriority.notes.api;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateNoteBlockRequest(
        @Size(min = 1, message = "type must not be blank when provided")
        String type,
        String content,
        @PositiveOrZero(message = "position must be greater than or equal to 0")
        Integer position,
        Boolean checked,
        String metadata
) {}
