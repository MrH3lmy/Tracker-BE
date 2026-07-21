package com.taskpriority.focus;

import com.taskpriority.model.FocusSessionStatus;

import java.time.LocalDateTime;

public record FocusSessionResponse(
        Long id,
        Long taskId,
        String taskTitle,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        FocusSessionStatus status,
        String note,
        Integer actualMinutes,
        int elapsedMinutes
) {}
