package com.taskpriority.task.api;

/**
 * Wraps the existing {@link TaskResponse} (already a purpose-built DTO) rather than duplicating
 * its ~35 fields, following the same composition style as {@link TaskDetailResponse}.
 *
 * @param blocked true if this task has a dependency on another task that isn't DONE/CANCELLED yet
 *                (computed from real TaskDependency rows, not the manual Status.BLOCKED label).
 */
public record TodayTaskResponse(TaskResponse task, TodayReason todayReason, boolean blocked) {
}
