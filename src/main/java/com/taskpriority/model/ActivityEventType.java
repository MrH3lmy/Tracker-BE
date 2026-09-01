package com.taskpriority.model;

/**
 * Machine-readable project activity event types (issue #288) - clients branch on this, never on
 * parsing {@code ProjectActivity.summary}. Deliberately limited to the events this slice's
 * features (#286-#288) actually produce; future work can add MILESTONE, RISK, and DECISION events.
 */
public enum ActivityEventType {
    PROJECT_CREATED,
    PROJECT_UPDATED,
    TASK_CREATED,
    TASK_UPDATED,
    TASK_COMPLETED,
    NOTE_CREATED,
    NOTE_UPDATED,
    NOTE_TASK_CREATED
}
