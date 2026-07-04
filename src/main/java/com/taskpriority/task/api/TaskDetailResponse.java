package com.taskpriority.task.api;

import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.notes.api.NoteTaskLinkResponse;

import java.util.List;

public record TaskDetailResponse(
        TaskResponse task,
        List<NoteResponse> notes,
        List<TaskScreenshotResponse> screenshots,
        List<NoteTaskLinkResponse> linkedNotes
) {
}
