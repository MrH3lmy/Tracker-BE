package com.taskpriority.settings;

import java.time.LocalTime;

/**
 * A start/end time-of-day window. When {@code start} is after {@code end}, the window is
 * understood to cross midnight (e.g. sleep 23:00-07:00) - callers must handle that themselves,
 * this record only carries the two boundary times.
 */
public record TimeWindow(LocalTime start, LocalTime end) {
    public boolean crossesMidnight() {
        return start.isAfter(end);
    }
}
