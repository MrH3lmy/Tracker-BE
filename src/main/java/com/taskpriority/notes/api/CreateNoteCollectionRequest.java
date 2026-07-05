package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNoteCollectionRequest(
        @NotBlank(message = "is required") @Size(max = 120, message = "must be at most 120 characters") String name,
        @Size(max = 1000, message = "description must be at most 1000 characters") String description,
        @Size(max = 40, message = "color must be at most 40 characters") String color,
        @Size(max = 80, message = "icon must be at most 80 characters") String icon
) {}
