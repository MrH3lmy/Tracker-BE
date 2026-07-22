package com.taskpriority.focus;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.FocusSession;
import com.taskpriority.model.FocusSessionPause;
import com.taskpriority.model.FocusSessionStatus;
import com.taskpriority.model.Task;
import com.taskpriority.repository.FocusSessionPauseRepository;
import com.taskpriority.repository.FocusSessionRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class FocusSessionService {
    private static final int ABANDON_CAP_MINUTES = 480;
    private static final List<FocusSessionStatus> ACTIVE_STATUSES = List.of(FocusSessionStatus.RUNNING, FocusSessionStatus.PAUSED);
    private static final int DIVERGENCE_THRESHOLD_PERCENT = 25;

    private final FocusSessionRepository focusSessionRepository;
    private final FocusSessionPauseRepository pauseRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final CurrentUserService currentUserService;

    public FocusSessionService(FocusSessionRepository focusSessionRepository, FocusSessionPauseRepository pauseRepository,
                                TaskRepository taskRepository, TaskService taskService, CurrentUserService currentUserService) {
        this.focusSessionRepository = focusSessionRepository;
        this.pauseRepository = pauseRepository;
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public FocusSession start(StartFocusSessionRequest request) {
        Long userId = currentUserService.requireUserId();
        if (request.taskId() != null && !taskRepository.existsByUserIdAndId(userId, request.taskId())) {
            throw new ResourceNotFoundException("Task with id " + request.taskId() + " not found");
        }
        abandonActiveSession(userId);
        FocusSession session = new FocusSession();
        session.setUserId(userId);
        session.setTaskId(request.taskId());
        session.setStartedAt(LocalDateTime.now());
        session.setStatus(FocusSessionStatus.RUNNING);
        return focusSessionRepository.save(session);
    }

    private void abandonActiveSession(Long userId) {
        focusSessionRepository.findFirstByUserIdAndStatusIn(userId, ACTIVE_STATUSES).ifPresent(existing -> {
            LocalDateTime now = LocalDateTime.now();
            if (existing.getStatus() == FocusSessionStatus.PAUSED) {
                pauseRepository.findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(existing.getId())
                        .ifPresent(openPause -> { openPause.setResumedAt(now); pauseRepository.save(openPause); });
            }
            existing.setStatus(FocusSessionStatus.ABANDONED);
            existing.setEndedAt(now);
            existing.setActualMinutes(computeActualMinutes(existing, now));
            focusSessionRepository.save(existing);
        });
    }

    @Transactional(readOnly = true)
    public FocusSession findActive() {
        Long userId = currentUserService.requireUserId();
        return focusSessionRepository.findFirstByUserIdAndStatusIn(userId, ACTIVE_STATUSES).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<FocusSession> findInRange(LocalDateTime from, LocalDateTime to) {
        Long userId = currentUserService.requireUserId();
        return focusSessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(userId, from, to);
    }

    @Transactional
    public FocusSession pause(Long id) {
        FocusSession session = findOwned(id);
        if (session.getStatus() != FocusSessionStatus.RUNNING) {
            throw new IllegalArgumentException("Only a running focus session can be paused.");
        }
        FocusSessionPause pauseRow = new FocusSessionPause();
        pauseRow.setSession(session);
        pauseRow.setPausedAt(LocalDateTime.now());
        pauseRepository.save(pauseRow);
        session.setStatus(FocusSessionStatus.PAUSED);
        return focusSessionRepository.save(session);
    }

    @Transactional
    public FocusSession resume(Long id) {
        FocusSession session = findOwned(id);
        if (session.getStatus() != FocusSessionStatus.PAUSED) {
            throw new IllegalArgumentException("Only a paused focus session can be resumed.");
        }
        FocusSessionPause openPause = pauseRepository.findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(session.getId())
                .orElseThrow(() -> new IllegalStateException("Paused session has no open pause interval."));
        openPause.setResumedAt(LocalDateTime.now());
        pauseRepository.save(openPause);
        session.setStatus(FocusSessionStatus.RUNNING);
        return focusSessionRepository.save(session);
    }

    @Transactional
    public FocusSession stop(Long id, StopFocusSessionRequest request) {
        FocusSession session = findOwned(id);
        if (!ACTIVE_STATUSES.contains(session.getStatus())) {
            throw new IllegalArgumentException("Only a running or paused focus session can be stopped.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (session.getStatus() == FocusSessionStatus.PAUSED) {
            pauseRepository.findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(session.getId())
                    .ifPresent(openPause -> { openPause.setResumedAt(now); pauseRepository.save(openPause); });
        }
        int minutes = computeActualMinutes(session, now);
        session.setEndedAt(now);
        session.setStatus(FocusSessionStatus.COMPLETED);
        session.setActualMinutes(minutes);
        if (request != null && request.note() != null) {
            session.setNote(request.note());
        }
        FocusSession saved = focusSessionRepository.save(session);

        if (saved.getTaskId() != null) {
            Long userId = currentUserService.requireUserId();
            taskRepository.findByUserIdAndId(userId, saved.getTaskId()).ifPresent(task -> {
                int previousActual = task.getActualMinutes() == null ? 0 : task.getActualMinutes();
                task.setActualMinutes(previousActual + minutes);
                taskRepository.save(task);
            });
            if (request != null && Boolean.TRUE.equals(request.completeTask())) {
                taskService.markComplete(saved.getTaskId());
            }
        }
        return saved;
    }

    public int elapsedMinutesNow(FocusSession session) {
        if (session.getStatus() == FocusSessionStatus.COMPLETED || session.getStatus() == FocusSessionStatus.ABANDONED) {
            return session.getActualMinutes() == null ? 0 : session.getActualMinutes();
        }
        return computeActualMinutes(session, LocalDateTime.now());
    }

    Task findTaskOrNull(Long taskId) {
        if (taskId == null) {
            return null;
        }
        Long userId = currentUserService.requireUserId();
        return taskRepository.findByUserIdAndId(userId, taskId).orElse(null);
    }

    private FocusSession findOwned(Long id) {
        Long userId = currentUserService.requireUserId();
        return focusSessionRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Focus session with id " + id + " not found"));
    }

    private int computeActualMinutes(FocusSession session, LocalDateTime at) {
        List<FocusSessionPause> pauses = pauseRepository.findBySessionIdOrderByPausedAtAsc(session.getId());
        long totalSeconds = Duration.between(session.getStartedAt(), at).getSeconds();
        long pausedSeconds = 0;
        for (FocusSessionPause pause : pauses) {
            LocalDateTime pauseEnd = pause.getResumedAt() != null ? pause.getResumedAt() : at;
            if (pauseEnd.isAfter(at)) pauseEnd = at;
            if (pauseEnd.isAfter(pause.getPausedAt())) {
                pausedSeconds += Duration.between(pause.getPausedAt(), pauseEnd).getSeconds();
            }
        }
        long activeSeconds = Math.max(0, totalSeconds - pausedSeconds);
        int minutes = (int) (activeSeconds / 60);
        return Math.min(minutes, ABANDON_CAP_MINUTES);
    }

    @Transactional(readOnly = true)
    public FocusAnalyticsResponse getAnalytics(LocalDate from, LocalDate to) {
        Long userId = currentUserService.requireUserId();
        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.plusDays(1).atStartOfDay();
        List<FocusSession> sessions = focusSessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(userId, fromDateTime, toDateTime)
                .stream()
                .filter(s -> s.getStatus() == FocusSessionStatus.COMPLETED || s.getStatus() == FocusSessionStatus.ABANDONED)
                .toList();

        Set<Long> taskIds = sessions.stream().map(FocusSession::getTaskId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Task> tasksById = taskIds.isEmpty() ? Map.of()
                : taskRepository.findAllById(taskIds).stream().collect(Collectors.toMap(Task::getId, task -> task));

        int totalMinutes = 0;
        Map<String, Integer> minutesByDay = new TreeMap<>();
        Map<String, Integer> minutesByArea = new TreeMap<>();
        Map<Integer, Integer> minutesByHour = new HashMap<>();
        Map<Long, Integer> actualByTask = new HashMap<>();

        for (FocusSession session : sessions) {
            int minutes = session.getActualMinutes() == null ? 0 : session.getActualMinutes();
            totalMinutes += minutes;
            minutesByDay.merge(session.getStartedAt().toLocalDate().toString(), minutes, Integer::sum);
            minutesByHour.merge(session.getStartedAt().getHour(), minutes, Integer::sum);

            Task task = session.getTaskId() != null ? tasksById.get(session.getTaskId()) : null;
            String areaKey = task != null && task.getArea() != null ? task.getArea().name() : "UNASSIGNED";
            minutesByArea.merge(areaKey, minutes, Integer::sum);

            if (session.getTaskId() != null) {
                actualByTask.merge(session.getTaskId(), minutes, Integer::sum);
            }
        }

        List<EstimateDivergence> divergences = actualByTask.entrySet().stream()
                .map(entry -> buildDivergence(tasksById.get(entry.getKey()), entry.getValue()))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(EstimateDivergence::divergencePercent).reversed())
                .toList();

        Integer mostProductiveHour = minutesByHour.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        return new FocusAnalyticsResponse(totalMinutes, sessions.size(), minutesByDay, minutesByArea, divergences, mostProductiveHour);
    }

    private EstimateDivergence buildDivergence(Task task, int actualMinutes) {
        if (task == null || task.getEstimatedMinutes() == null || task.getEstimatedMinutes() <= 0) return null;
        int estimated = task.getEstimatedMinutes();
        int divergencePercent = (int) Math.round(Math.abs(actualMinutes - estimated) * 100.0 / estimated);
        if (divergencePercent < DIVERGENCE_THRESHOLD_PERCENT) return null;
        return new EstimateDivergence(task.getId(), task.getTitle(), estimated, actualMinutes, divergencePercent);
    }
}
