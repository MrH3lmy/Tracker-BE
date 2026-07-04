package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record CreateNoteFromTemplateRequest(
        @NotNull @Positive Long templateId,
        @Size(max = 255) String title,
        @Positive Long taskId,
        @Size(max = 20) List<@Size(max = 80) String> tags,
        Map<String, String> variables
) {}
