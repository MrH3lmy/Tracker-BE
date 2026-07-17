package com.taskpriority.scheduler;

import com.taskpriority.habit.HabitResponse;
import com.taskpriority.model.SchedulePriority;
import com.taskpriority.task.api.TaskResponse;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ScheduledEntryResponse(
        String kind,
        Long id,
        TaskResponse task,
        HabitResponse habit,
        LocalDate scheduledDate,
        LocalTime startTime,
        LocalTime endTime,
        int durationMinutes,
        SchedulePriority priorityLevel,
        List<Long> overlapsWithIds
) {
    public static ScheduledEntryResponse forTask(ScheduledTaskResponse response) {
        return new ScheduledEntryResponse("TASK", response.taskId(), response.task(), null, response.scheduledDate(),
                response.startTime(), response.endTime(), response.durationMinutes(), response.priorityLevel(),
                response.overlapsWithTaskIds());
    }

    public static ScheduledEntryResponse forHabit(ScheduledHabitResponse response) {
        return new ScheduledEntryResponse("HABIT", response.habitId(), null, response.habit(), response.scheduledDate(),
                response.startTime(), response.endTime(), response.durationMinutes(), response.priorityLevel(),
                response.overlapsWithHabitIds());
    }
}
