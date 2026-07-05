package com.taskpriority.notes.api;

import java.time.LocalDateTime;
import java.util.Map;

public record NoteSavedViewResponse(
        Long id,
        String name,
        Map<String, Object> filters,
        String sortField,
        String sortDirection,
        String viewType,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
