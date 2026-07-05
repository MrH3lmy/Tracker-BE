package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record NoteSavedViewRequest(
        @NotBlank @Size(max = 120) String name,
        Map<String, Object> filters,
        String sortField,
        String sortDirection,
        String viewType
) {
}
