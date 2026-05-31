package com.taskpriority.task.api;

import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Task;
import org.springframework.stereotype.Component;

@Component
public class TaskApiMapper {

    public Task fromCreateRequest(CreateTaskRequest request) {
        Task task = new Task();
        applyCommonFields(task, request.title(), request.description(), request.dueDate(), request.important(),
                request.status(), request.area(), request.effort(), request.blockedReason(), request.waitingOn(),
                request.followUpDate(), request.boardColumnId(), request.position(), request.recurrence(), true);
        return task;
    }

    public void applyUpdateRequest(Task existing, UpdateTaskRequest request) {
        applyCommonFields(existing, request.title(), request.description(), request.dueDate(), request.important(),
                request.status(), request.area(), request.effort(), request.blockedReason(), request.waitingOn(),
                request.followUpDate(), request.boardColumnId(), request.position(), request.recurrence(), false);
    }

    public TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getCreatedDate(),
                task.getCompletedDate(),
                task.isImportant(),
                task.getStatus(),
                task.getArea(),
                task.getEffort(),
                task.getBlockedReason(),
                task.getWaitingOn(),
                task.getFollowUpDate(),
                task.getDaysLeft(),
                task.isOverdue(),
                task.isUrgent(),
                task.getPriorityScore(),
                task.getPriorityCategory(),
                task.getAgeFlag(),
                task.getPriorityReason(),
                task.getBoardColumnId(),
                task.getPosition()
        );
    }

    private void applyCommonFields(Task task, String title, String description, java.time.LocalDate dueDate,
                                   boolean important, com.taskpriority.model.Status status,
                                   com.taskpriority.model.Area area, com.taskpriority.model.Effort effort,
                                   String blockedReason, String waitingOn, java.time.LocalDate followUpDate,
                                   Long boardColumnId, Integer position,
                                   CreateTaskRequest.RecurrenceRuleRequest recurrence,
                                   boolean clearRecurrenceWhenMissing) {
        task.setTitle(title);
        task.setDescription(description);
        task.setDueDate(dueDate);
        task.setImportant(important);
        if (status != null) task.setStatus(status);
        if (area != null) task.setArea(area);
        if (effort != null) task.setEffort(effort);
        task.setBlockedReason(blockedReason);
        task.setWaitingOn(waitingOn);
        task.setFollowUpDate(followUpDate);
        task.setBoardColumnId(boardColumnId);
        if (position != null) task.setPosition(position);
        if (recurrence != null) {
            RecurrenceRule recurrenceRule = new RecurrenceRule();
            recurrenceRule.setFrequency(recurrence.frequency());
            recurrenceRule.setInterval(recurrence.interval());
            recurrenceRule.setDaysOfWeek(recurrence.daysOfWeek());
            recurrenceRule.setDayOfMonth(recurrence.dayOfMonth());
            recurrenceRule.setAnnualDate(recurrence.annualDate());
            task.setRecurrenceRule(recurrenceRule);
        } else if (clearRecurrenceWhenMissing) {
            task.setRecurrenceRule(null);
        }
    }
}
