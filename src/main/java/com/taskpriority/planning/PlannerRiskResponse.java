package com.taskpriority.planning;

public record PlannerRiskResponse(
        Level level,
        String reason
) {
    public enum Level {
        LOW,
        MEDIUM,
        HIGH
    }
}
