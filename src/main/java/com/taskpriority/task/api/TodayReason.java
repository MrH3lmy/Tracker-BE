package com.taskpriority.task.api;

/**
 * Why a task appears in a Today view (issue #286) - lets the client branch on this instead of
 * comparing dueDate/startDate against "today" itself.
 */
public enum TodayReason {
    OVERDUE,
    DUE_TODAY,
    SCHEDULED_TODAY
}
