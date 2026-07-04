package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateNoteTaskLinkRequest(
        @NotNull Long taskId,
        Long blockId,
        @Size(max = 100) String linkType,
        String selectedText
) {
}
