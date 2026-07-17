package com.taskpriority.scheduler;

import java.util.List;

public record AutoScheduleResult(
        List<Long> scheduledTaskIds,
        List<Long> scheduledHabitIds,
        List<Long> unresolvedTaskIds,
        List<Long> unresolvedHabitIds
) {
}
