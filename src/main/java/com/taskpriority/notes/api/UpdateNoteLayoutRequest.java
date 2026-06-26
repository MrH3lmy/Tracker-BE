package com.taskpriority.notes.api;

import jakarta.validation.constraints.Size;

public record UpdateNoteLayoutRequest(
        Integer displayOrder,

        Integer positionX,

        Integer positionY,

        Integer width,

        Integer height,

        @Size(max = 40, message = "color must be at most 40 characters")
        String color,

        Integer zIndex
) {
}
