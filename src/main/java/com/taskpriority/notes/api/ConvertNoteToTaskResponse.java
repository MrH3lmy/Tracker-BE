package com.taskpriority.notes.api;

import com.taskpriority.task.api.TaskResponse;

public record ConvertNoteToTaskResponse(TaskResponse task, NoteTaskLinkResponse link) {}
