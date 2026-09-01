package com.taskpriority.model;

/**
 * Minimal display info for one unfinished required (BLOCKS-type) prerequisite task, attached to
 * the blocked task's derived readiness (see {@code TaskReadinessService}). Deliberately not the
 * full {@code Task} entity/response - callers need enough to answer "why is this task blocked?"
 * without an extra fetch per blocker, not the blocker's entire record.
 */
public record TaskBlockerSummary(Long id, String title, Status status) {
}
