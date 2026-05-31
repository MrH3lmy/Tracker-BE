package com.taskpriority.task.api;

import com.taskpriority.model.AgeFlag;
import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.PriorityCategory;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record TaskResponse(
        Long id,
        String title,
        String description,
        LocalDate dueDate,
        LocalDate startDate,
        Integer estimatedMinutes,
        Integer actualMinutes,
        RiskLevel riskLevel,
        String riskReason,
        String track,
        String phase,
        Long parentTaskId,
        LocalDateTime createdDate,
        LocalDateTime completedDate,
        boolean important,
        Status status,
        Area area,
        Effort effort,
        String blockedReason,
        String waitingOn,
        LocalDate followUpDate,
        Integer daysLeft,
        boolean overdue,
        boolean urgent,
        int priorityScore,
        PriorityCategory priorityCategory,
        AgeFlag ageFlag,
        String priorityReason,
        Long boardColumnId,
        int position,
        List<Long> dependencyIds,
        List<Long> blockingTaskIds,
        List<Long> subtaskIds,
        int subtaskCount,
        int completedSubtaskCount,
        int subtaskProgressPercent
) {
    public TaskResponse(
            Long id,
            String title,
            String description,
            LocalDate dueDate,
            LocalDateTime createdDate,
            LocalDateTime completedDate,
            boolean important,
            Status status,
            Area area,
            Effort effort,
            String blockedReason,
            String waitingOn,
            LocalDate followUpDate,
            Integer daysLeft,
            boolean overdue,
            boolean urgent,
            int priorityScore,
            PriorityCategory priorityCategory,
            AgeFlag ageFlag,
            String priorityReason,
            Long boardColumnId,
            int position
    ) {
        this(id, title, description, dueDate, null, null, null, RiskLevel.LOW, null, null, null, null, createdDate,
                completedDate, important, status, area, effort, blockedReason, waitingOn, followUpDate, daysLeft,
                overdue, urgent, priorityScore, priorityCategory, ageFlag, priorityReason, boardColumnId, position,
                List.of(), List.of(), List.of(), 0, 0, 0);
    }
}
