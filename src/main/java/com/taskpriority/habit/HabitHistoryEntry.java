package com.taskpriority.habit;

import java.time.LocalDate;

public record HabitHistoryEntry(Long habitId, LocalDate date, int count) {
}
