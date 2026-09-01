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
        Long parentTaskId,
        /**
         * The meeting-note action item being converted, i.e. a specific {@code NoteBlock} within
         * this note (issue #287). When present, this is the idempotency key: converting the same
         * (note, block) pair again returns the task/link already created for it instead of making
         * a duplicate. Omitted entirely, behavior is unchanged from before this field existed -
         * every call creates a new task from the free-text selection/title/body.
         */
        @Positive(message = "noteBlockId must be greater than 0")
        Long noteBlockId
) {}
