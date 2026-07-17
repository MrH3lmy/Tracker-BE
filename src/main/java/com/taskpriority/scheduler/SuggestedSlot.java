package com.taskpriority.scheduler;

import java.time.LocalDate;
import java.time.LocalTime;

public record SuggestedSlot(LocalDate scheduledDate, LocalTime startTime, int durationMinutes) {
}
