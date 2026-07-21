package com.taskpriority.focus;

public record EstimateDivergence(
        Long taskId,
        String taskTitle,
        Integer estimatedMinutes,
        int actualMinutes,
        int divergencePercent
) {}
