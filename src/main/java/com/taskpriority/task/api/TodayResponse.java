package com.taskpriority.task.api;

import java.time.LocalDate;
import java.util.List;

/**
 * {@code date} is the caller's current date per the application's configured timezone
 * (see {@code SettingsService.getTimezoneForUser}), not the JVM/server default zone.
 * {@code tasks} is pre-ordered: overdue, then due-today, then scheduled-today, and within each
 * group by priority score desc, due date asc, id asc - deterministic, never re-sorted by the client.
 */
public record TodayResponse(LocalDate date, List<TodayTaskResponse> tasks) {
}
