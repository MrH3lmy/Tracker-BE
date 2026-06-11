package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateNoteRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,

        @NotBlank(message = "is required")
        String body,

        @NotNull(message = "is required")
        NoteContentType contentType,

        @Positive(message = "taskId must be greater than 0")
        Long taskId,

        @Size(max = 20, message = "tags must contain at most 20 items")
        List<@Size(max = 80, message = "tag must be at most 80 characters") String> tags
) {
}
