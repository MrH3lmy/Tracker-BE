package com.taskpriority.scheduler;

import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public record DayScheduleResponse(
        LocalDate date,
        List<ScheduledTaskResponse> scheduled,
        List<TaskResponse> unscheduled
) {
}
