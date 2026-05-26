package com.taskpriority.task.api;

import com.taskpriority.model.AgeFlag;
import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.PriorityCategory;
import com.taskpriority.model.Status;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TaskResponse(
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
        int priorityScore,
        PriorityCategory priorityCategory,
        AgeFlag ageFlag
) {}
