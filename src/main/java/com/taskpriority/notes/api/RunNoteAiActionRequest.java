package com.taskpriority.notes.api;

import com.taskpriority.model.NoteAiAction;
import jakarta.validation.constraints.NotNull;

public record RunNoteAiActionRequest(@NotNull NoteAiAction action) {}
