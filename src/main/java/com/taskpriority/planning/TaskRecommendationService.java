package com.taskpriority.planning;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Area;
import com.taskpriority.model.Effort;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.PriorityEngine;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class TaskRecommendationService {
    private static final int DEFAULT_LIMIT = 5;

    private final TaskRepository taskRepository;
    private final PriorityEngine priorityEngine;
    private final TaskApiMapper taskApiMapper;
    private final CurrentUserService currentUserService;

    public TaskRecommendationService(TaskRepository taskRepository, PriorityEngine priorityEngine, TaskApiMapper taskApiMapper, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.priorityEngine = priorityEngine;
        this.taskApiMapper = taskApiMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<TaskRecommendationResponse> getRecommendations() {
        Long userId = currentUserService.requireUserId();
        LocalDate today = LocalDate.now();
        List<RecommendationCandidate> candidates = taskRepository.findByUserId(userId).stream()
                .filter(task -> !task.isDeleted())
                .filter(task -> task.getStatus() != Status.DONE && task.getStatus() != Status.CANCELLED)
                .filter(task -> Area.WORK_AREAS.contains(task.getArea()))
                .map(task -> candidate(task, today))
                .sorted(Comparator.comparingInt(RecommendationCandidate::recommendationScore).reversed()
                        .thenComparing(candidate -> candidate.task().getDueDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(candidate -> candidate.task().getCreatedDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(candidate -> candidate.task().getId(), Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(DEFAULT_LIMIT)
                .toList();

        List<TaskRecommendationResponse> recommendations = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            RecommendationCandidate candidate = candidates.get(i);
            recommendations.add(new TaskRecommendationResponse(
                    taskApiMapper.toResponse(candidate.task()),
                    candidate.recommendedAction(),
                    candidate.reasonCodes(),
                    candidate.explanation(),
                    candidate.confidence(),
                    candidate.blockerWarnings(),
                    i + 1
            ));
        }
        return recommendations;
    }

    private RecommendationCandidate candidate(Task task, LocalDate today) {
        PriorityEngine.PriorityComputation computation = priorityEngine.compute(task);
        applyPriorityComputation(task, computation);

        List<String> reasonCodes = new ArrayList<>();
        List<String> explanationParts = new ArrayList<>();
        List<String> blockerWarnings = new ArrayList<>();
        int adjustment = 0;

        if (computation.overdue()) {
            reasonCodes.add("DUE_OVERDUE");
            explanationParts.add("it is overdue");
            adjustment += 25;
        } else if (task.getDueDate() != null && task.getDueDate().isEqual(today)) {
            reasonCodes.add("DUE_TODAY");
            explanationParts.add("it is due today");
            adjustment += 18;
        } else if (computation.urgent()) {
            reasonCodes.add("DUE_SOON");
            explanationParts.add("its due date is approaching");
            adjustment += 10;
        }

        if (task.isImportant()) {
            reasonCodes.add("IMPORTANT");
            explanationParts.add("it is marked important");
            adjustment += 12;
        }

        if (task.getEffort() == Effort.QUICK) {
            reasonCodes.add("QUICK_WIN");
            explanationParts.add("it is a quick win");
            adjustment += 8;
        } else if (task.getEffort() == Effort.LARGE) {
            reasonCodes.add("LARGE_EFFORT");
            explanationParts.add("it needs a larger work block");
            adjustment -= 4;
        }

        if (task.getStatus() == Status.IN_PROGRESS) {
            reasonCodes.add("ALREADY_IN_PROGRESS");
            explanationParts.add("it is already in progress");
            adjustment += 12;
        } else if (task.getStatus() == Status.NOT_STARTED) {
            reasonCodes.add("READY_TO_START");
            explanationParts.add("it is ready to start");
            adjustment += 5;
        } else if (task.getStatus() == Status.BACKLOG) {
            reasonCodes.add("BACKLOG_CANDIDATE");
            explanationParts.add("it is a strong backlog candidate to pull forward");
        }

        applyFollowUpSignals(task, today, reasonCodes, explanationParts, blockerWarnings);
        if (task.getStatus() == Status.WAITING) {
            adjustment += followUpAdjustment(task, today, 12, -18);
        }
        if (task.getStatus() == Status.BLOCKED) {
            adjustment += followUpAdjustment(task, today, 8, -25);
        }

        if (reasonCodes.isEmpty()) {
            reasonCodes.add("PRIORITY_SCORE");
            explanationParts.add("it has the best overall priority score among available work");
        }

        int recommendationScore = computation.priorityScore() + adjustment;
        double confidence = Math.min(0.98, Math.max(0.35, 0.45 + (recommendationScore / 150.0)));
        return new RecommendationCandidate(
                task,
                recommendationScore,
                recommendedAction(task, computation, today),
                List.copyOf(reasonCodes),
                explanation(task, computation, explanationParts),
                Math.round(confidence * 100.0) / 100.0,
                List.copyOf(blockerWarnings)
        );
    }

    private void applyFollowUpSignals(Task task, LocalDate today, List<String> reasonCodes,
                                      List<String> explanationParts, List<String> blockerWarnings) {
        if (task.getStatus() == Status.WAITING) {
            reasonCodes.add("WAITING_ON_DEPENDENCY");
            if (hasText(task.getWaitingOn())) {
                blockerWarnings.add("Waiting on " + task.getWaitingOn());
            } else {
                blockerWarnings.add("Waiting task has no waiting-on owner recorded.");
            }
        }

        if (task.getStatus() == Status.BLOCKED) {
            reasonCodes.add("BLOCKED");
            if (hasText(task.getBlockedReason())) {
                blockerWarnings.add("Blocked: " + task.getBlockedReason());
            } else {
                blockerWarnings.add("Blocked task has no blocked reason recorded.");
            }
        }

        if (task.getFollowUpDate() == null) {
            return;
        }

        long daysUntilFollowUp = ChronoUnit.DAYS.between(today, task.getFollowUpDate());
        if (daysUntilFollowUp < 0) {
            reasonCodes.add("FOLLOW_UP_OVERDUE");
            explanationParts.add("its follow-up date has passed");
        } else if (daysUntilFollowUp == 0) {
            reasonCodes.add("FOLLOW_UP_TODAY");
            explanationParts.add("its follow-up is due today");
        } else if (daysUntilFollowUp <= 2) {
            reasonCodes.add("FOLLOW_UP_SOON");
            explanationParts.add("its follow-up is coming soon");
        }
    }

    private int followUpAdjustment(Task task, LocalDate today, int dueBoost, int blockedPenalty) {
        if (task.getFollowUpDate() == null) {
            return blockedPenalty;
        }
        return !task.getFollowUpDate().isAfter(today) ? dueBoost : blockedPenalty;
    }

    private String recommendedAction(Task task, PriorityEngine.PriorityComputation computation, LocalDate today) {
        if (task.getStatus() == Status.BLOCKED) {
            return task.getFollowUpDate() != null && !task.getFollowUpDate().isAfter(today) ? "Resolve blocker" : "Clarify blocker";
        }
        if (task.getStatus() == Status.WAITING) {
            return task.getFollowUpDate() != null && !task.getFollowUpDate().isAfter(today) ? "Follow up" : "Monitor dependency";
        }
        if (task.getStatus() == Status.IN_PROGRESS) {
            return "Continue now";
        }
        if (computation.overdue() || computation.urgent()) {
            return "Do next";
        }
        if (task.getEffort() == Effort.LARGE || task.getEffort() == Effort.DEEP_WORK) {
            return "Schedule focus time";
        }
        return "Start next";
    }

    private String explanation(Task task, PriorityEngine.PriorityComputation computation, List<String> explanationParts) {
        if (task.getDueDate() != null
                && task.getStatus() == Status.IN_PROGRESS
                && explanationParts.contains("it is due today")
                && explanationParts.contains("its follow-up is due today")) {
            return "Due today, already in progress, and needs follow-up today.";
        }
        if (task.getStatus() == Status.IN_PROGRESS && explanationParts.stream().anyMatch(part -> part.contains("follow-up"))) {
            return "Already in progress with an upcoming follow-up.";
        }
        if (explanationParts.contains("its due date is approaching")
                || explanationParts.contains("its follow-up is coming soon")) {
            return "Due soon and ready to continue.";
        }
        if (explanationParts.contains("it is due today")) {
            return task.getStatus() == Status.IN_PROGRESS
                    ? "Due today and ready to continue."
                    : "Due today and ready for action.";
        }
        if (computation.overdue()) {
            return "Overdue and needs attention now.";
        }
        return "Recommended next action based on current task signals.";
    }

    private void applyPriorityComputation(Task task, PriorityEngine.PriorityComputation computation) {
        task.setDaysLeft(computation.daysLeft());
        task.setOverdue(computation.overdue());
        task.setUrgent(computation.urgent());
        task.setPriorityScore(computation.priorityScore());
        task.setPriorityCategory(computation.priorityCategory());
        task.setAgeFlag(computation.ageFlag());
        task.setPriorityReason(computation.priorityReason());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record RecommendationCandidate(
            Task task,
            int recommendationScore,
            String recommendedAction,
            List<String> reasonCodes,
            String explanation,
            double confidence,
            List<String> blockerWarnings
    ) {}
}
