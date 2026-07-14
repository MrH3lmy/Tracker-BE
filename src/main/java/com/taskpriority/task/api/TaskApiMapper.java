package com.taskpriority.task.api;

import com.taskpriority.model.RecurrenceRule;
import com.taskpriority.model.Task;
import org.springframework.stereotype.Component;

@Component
public class TaskApiMapper {

    public Task fromCreateRequest(CreateTaskRequest request) {
        Task task = new Task();
        applyCommonFields(task, request.title(), request.description(), request.dueDate(), request.startDate(),
                request.estimatedMinutes(), request.actualMinutes(), request.riskLevel(), request.riskReason(),
                request.track(), request.phase(), request.parentTaskId(), request.important(), request.status(), request.area(),
                request.effort(), request.blockedReason(), request.waitingOn(), request.followUpDate(),
                request.boardColumnId(), request.position(), request.dailyTargetCount(), request.recurrence(), true);
        return task;
    }

    public void applyUpdateRequest(Task existing, UpdateTaskRequest request) {
        applyCommonFields(existing, request.title(), request.description(), request.dueDate(), request.startDate(),
                request.estimatedMinutes(), request.actualMinutes(), request.riskLevel(), request.riskReason(),
                request.track(), request.phase(), request.parentTaskId(), request.important(), request.status(), request.area(),
                request.effort(), request.blockedReason(), request.waitingOn(), request.followUpDate(),
                request.boardColumnId(), request.position(), request.dailyTargetCount(), request.recurrence(), true);
    }

    public TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueDate(),
                task.getStartDate(),
                task.getEstimatedMinutes(),
                task.getActualMinutes(),
                task.getRiskLevel(),
                task.getRiskReason(),
                task.getTrack(),
                task.getPhase(),
                task.getParentTaskId(),
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
                task.getPosition(),
                task.getDependencyIds(),
                task.getBlockingTaskIds(),
                task.getSubtaskIds(),
                task.getSubtaskCount(),
                task.getCompletedSubtaskCount(),
                task.getSubtaskProgressPercent(),
                task.getDailyTargetCount(),
                task.getTodayCheckInCount(),
                task.isTodayTargetMet(),
                toRecurrenceResponse(task.getRecurrenceRule())
        );
    }

    private TaskResponse.RecurrenceRuleResponse toRecurrenceResponse(RecurrenceRule rule) {
        if (rule == null || rule.getFrequency() == null || rule.getFrequency() == RecurrenceRule.Frequency.NONE) {
            return null;
        }
        return new TaskResponse.RecurrenceRuleResponse(
                rule.getFrequency(),
                rule.getInterval(),
                rule.getDaysOfWeek(),
                rule.getDayOfMonth(),
                rule.getAnnualDate(),
                rule.getNextDueDate(),
                rule.getLastCompletedDate(),
                rule.getCurrentStreak(),
                rule.getLongestStreak()
        );
    }

    private void applyCommonFields(Task task, String title, String description, java.time.LocalDate dueDate,
                                   java.time.LocalDate startDate, Integer estimatedMinutes, Integer actualMinutes,
                                   com.taskpriority.model.RiskLevel riskLevel, String riskReason, String track,
                                   String phase, Long parentTaskId, boolean important, com.taskpriority.model.Status status,
                                   com.taskpriority.model.Area area, com.taskpriority.model.Effort effort,
                                   String blockedReason, String waitingOn, java.time.LocalDate followUpDate,
                                   Long boardColumnId, Integer position, Integer dailyTargetCount,
                                   CreateTaskRequest.RecurrenceRuleRequest recurrence,
                                   boolean clearRecurrenceWhenMissing) {
        task.setTitle(title);
        task.setDescription(description);
        task.setDueDate(dueDate);
        task.setStartDate(startDate);
        task.setEstimatedMinutes(estimatedMinutes);
        task.setActualMinutes(actualMinutes);
        if (riskLevel != null) task.setRiskLevel(riskLevel);
        task.setRiskReason(riskReason);
        task.setTrack(track);
        task.setPhase(phase);
        task.setParentTaskId(parentTaskId);
        task.setImportant(important);
        if (status != null) task.setStatus(status);
        if (area != null) task.setArea(area);
        if (effort != null) task.setEffort(effort);
        task.setBlockedReason(blockedReason);
        task.setWaitingOn(waitingOn);
        task.setFollowUpDate(followUpDate);
        task.setBoardColumnId(boardColumnId);
        if (position != null) task.setPosition(position);
        task.setDailyTargetCount(dailyTargetCount);
        if (recurrence != null) {
            // Mutate the existing rule in place (rather than replacing it) so an edit
            // doesn't wipe out nextDueDate/lastCompletedDate/streak history.
            RecurrenceRule recurrenceRule = task.getRecurrenceRule() != null ? task.getRecurrenceRule() : new RecurrenceRule();
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
