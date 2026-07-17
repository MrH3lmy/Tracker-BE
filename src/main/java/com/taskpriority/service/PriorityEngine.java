package com.taskpriority.service;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.*;
import com.taskpriority.repository.PriorityScoringSettingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class PriorityEngine {

    private final PriorityScoringSettingRepository scoringSettingRepository;
    private final CurrentUserService currentUserService;

    public PriorityEngine(PriorityScoringSettingRepository scoringSettingRepository, CurrentUserService currentUserService) {
        this.scoringSettingRepository = scoringSettingRepository;
        this.currentUserService = currentUserService;
    }

    public PriorityComputation compute(Task task) {
        return compute(task, new DependencyContext(0, 0));
    }

    public PriorityComputation compute(Task task, DependencyContext dependencies) {
        LocalDate today = LocalDate.now();

        Integer daysLeft = task.getDueDate() == null ? null : (int) ChronoUnit.DAYS.between(today, task.getDueDate());
        boolean overdue = daysLeft != null && daysLeft < 0;
        boolean urgent = daysLeft != null && daysLeft <= get("urgency.days.urgent.threshold", 2);

        int dueScore = dueDateScore(daysLeft);
        int importanceScore = task.isImportant() ? get("importance.weight", 50) : 0;
        int effortPenalty = effortPenalty(task.getEffort());
        int statusPenalty = statusPenalty(task.getStatus());
        int followUpScore = followUpScore(task, today);
        int blockerScore = blockerScore(task, dependencies, today);

        int total = dueScore + importanceScore + followUpScore + blockerScore - effortPenalty - statusPenalty;
        PriorityCategory category = category(task.isImportant(), urgent);
        AgeFlag ageFlag = ageFlag(task, today);

        String reason = reason(task, daysLeft, overdue, urgent, dueScore, importanceScore, followUpScore, blockerScore, dependencies, effortPenalty, statusPenalty, total, category, ageFlag);
        return new PriorityComputation(daysLeft, overdue, urgent, total, category, ageFlag, reason);
    }

    private int dueDateScore(Integer daysLeft) {
        if (daysLeft == null) return 0;
        if (daysLeft < 0) return get("urgency.weight.overdue", 30);
        if (daysLeft <= get("urgency.days.urgent.threshold", 2)) return get("urgency.weight.urgent", 20);
        if (daysLeft <= get("urgency.days.soon.threshold", 7)) return get("urgency.weight.soon", 10);
        return 0;
    }

    private int followUpScore(Task task, LocalDate today) {
        if ((task.getStatus() != Status.WAITING && task.getStatus() != Status.BLOCKED) || task.getFollowUpDate() == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(today, task.getFollowUpDate());
        if (days < 0) return get("follow_up.weight.overdue", 20);
        if (days <= get("follow_up.days.due.threshold", 0)) return get("follow_up.weight.due", 10);
        return 0;
    }

    private int blockerScore(Task task, DependencyContext dependencies, LocalDate today) {
        int score = 0;
        if (task.getStatus() == Status.BLOCKED && dependencies.dependencyCount() > 0) {
            score -= get("dependency.penalty.blocked", 20);
        }
        if (dependencies.blockingCount() > 0) {
            score += dependencies.blockingCount() * get("dependency.weight.blocks_task", 15);
        }
        if (task.getStatus() == Status.WAITING && task.getCreatedDate() != null) {
            long waitingDays = ChronoUnit.DAYS.between(task.getCreatedDate().toLocalDate(), today);
            if (waitingDays >= get("waiting.days.stale.threshold", 7)) {
                score += get("waiting.weight.stale", 12);
            }
        }
        if ((task.getStatus() == Status.WAITING || task.getStatus() == Status.BLOCKED)
                && task.getFollowUpDate() != null
                && task.getFollowUpDate().isBefore(today)) {
            score += get("follow_up.weight.overdue_follow_up", 10);
        }
        return score;
    }

    private int statusPenalty(Status status) {
        return switch (status) {
            case DONE -> get("status.penalty.done", 100);
            case CANCELLED -> get("status.penalty.cancelled", 100);
            case WAITING -> get("status.penalty.waiting", 5);
            case BLOCKED -> get("status.penalty.blocked", 10);
            default -> 0;
        };
    }

    private int effortPenalty(Effort effort) {
        return switch (effort) {
            case QUICK -> get("effort.penalty.quick", 0);
            case MEDIUM -> get("effort.penalty.medium", 5);
            case DEEP_WORK -> get("effort.penalty.deep_work", 10);
            case LARGE -> get("effort.penalty.large", 20);
        };
    }

    private PriorityCategory category(boolean important, boolean urgent) {
        if (important && urgent) return PriorityCategory.DO_NOW;
        if (important) return PriorityCategory.SCHEDULE;
        if (urgent) return PriorityCategory.DELEGATE;
        return PriorityCategory.DELETE;
    }

    private AgeFlag ageFlag(Task task, LocalDate today) {
        if (task.getCreatedDate() == null) return null;
        long ageDays = ChronoUnit.DAYS.between(task.getCreatedDate().toLocalDate(), today);
        if (ageDays <= get("age.days.new.max", 7)) return AgeFlag.NEW;
        if (ageDays <= get("age.days.aging.max", 30)) return AgeFlag.AGING;
        return AgeFlag.STALE;
    }

    private String reason(Task task, Integer daysLeft, boolean overdue, boolean urgent,
                          int dueScore, int importanceScore, int followUpScore, int blockerScore,
                          DependencyContext dependencies, int effortPenalty, int statusPenalty, int total,
                          PriorityCategory category, AgeFlag ageFlag) {
        List<String> parts = new ArrayList<>();
        parts.add("status=" + task.getStatus());
        parts.add("important=" + task.isImportant() + "(+" + importanceScore + ")");
        parts.add("due=" + (daysLeft == null ? "none" : daysLeft + "d") + "(+" + dueScore + ")");
        parts.add("followUp=" + (task.getFollowUpDate() == null ? "none" : task.getFollowUpDate()) + "(+" + followUpScore + ")");
        parts.add("dependencies=blockedBy:" + dependencies.dependencyCount() + ",blocks:" + dependencies.blockingCount() + "(" + (blockerScore >= 0 ? "+" : "") + blockerScore + ")");
        parts.add("effort=" + task.getEffort() + "(-" + effortPenalty + ")");
        parts.add("statusPenalty=(-" + statusPenalty + ")");
        parts.add("flags=[overdue=" + overdue + ",urgent=" + urgent + ",age=" + ageFlag + "]");
        parts.add("category=" + category);
        parts.add("score=" + total);
        return parts.stream().sorted(Comparator.naturalOrder()).reduce((a, b) -> a + " | " + b).orElse("");
    }

    private int get(String key, int defaultValue) {
        return scoringSettingRepository.findByUserIdAndSettingName(currentUserService.requireUserId(), key)
                .map(PriorityScoringSetting::getSettingValue)
                .orElse(defaultValue);
    }

    public record DependencyContext(int dependencyCount, int blockingCount) {}

    public record PriorityComputation(
            Integer daysLeft,
            boolean overdue,
            boolean urgent,
            int priorityScore,
            PriorityCategory priorityCategory,
            AgeFlag ageFlag,
            String priorityReason
    ) {}
}
