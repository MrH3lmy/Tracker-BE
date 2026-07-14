package com.taskpriority.scheduler;

import com.taskpriority.model.SchedulePriority;
import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ScheduledTaskResponse(
        Long taskId,
        TaskResponse task,
        LocalDate scheduledDate,
        LocalTime startTime,
        LocalTime endTime,
        int durationMinutes,
        SchedulePriority priorityLevel,
        List<Long> overlapsWithTaskIds
) {
}
