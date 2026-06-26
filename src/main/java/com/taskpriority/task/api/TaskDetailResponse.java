package com.taskpriority.task.api;

import com.taskpriority.notes.api.NoteResponse;

import java.util.List;

public record TaskDetailResponse(
        TaskResponse task,
        List<NoteResponse> notes
) {
}
