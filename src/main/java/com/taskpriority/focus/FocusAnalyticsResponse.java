package com.taskpriority.focus;

import java.util.List;
import java.util.Map;

public record FocusAnalyticsResponse(
        int totalMinutes,
        int sessionCount,
        Map<String, Integer> minutesByDay,
        Map<String, Integer> minutesByArea,
        List<EstimateDivergence> estimateDivergences,
        Integer mostProductiveHour
) {}
