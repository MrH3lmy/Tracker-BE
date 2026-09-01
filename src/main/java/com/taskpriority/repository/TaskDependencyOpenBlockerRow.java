package com.taskpriority.repository;

import com.taskpriority.model.Status;

/**
 * Query projection for {@link TaskDependencyRepository#findOpenBlockers}: one open (not
 * DONE/CANCELLED) required prerequisite for one task, batch-loaded for a whole set of tasks in a
 * single query so readiness can be computed for N tasks without N dependency lookups.
 */
public record TaskDependencyOpenBlockerRow(Long taskId, Long blockerId, String blockerTitle, Status blockerStatus) {
}
