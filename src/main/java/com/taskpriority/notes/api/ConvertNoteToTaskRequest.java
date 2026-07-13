package com.taskpriority.notes.api;

import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.Status;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ConvertNoteToTaskRequest(
        @Size(max = 255, message = "title must be at most 255 characters")
        String title,
        String selectedText,
        String description,
        LocalDate dueDate,
        Status status,
        Area area,
        Effort effort,
        @Positive(message = "parentTaskId must be greater than 0")
        Long parentTaskId
) {}
