package com.taskpriority.focus;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Area;
import com.taskpriority.model.FocusSession;
import com.taskpriority.model.FocusSessionPause;
import com.taskpriority.model.FocusSessionStatus;
import com.taskpriority.model.Task;
import com.taskpriority.repository.FocusSessionPauseRepository;
import com.taskpriority.repository.FocusSessionRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class FocusSessionServiceTest {
    private static final Long USER_ID = 1L;

    private FocusSessionRepository focusSessionRepository;
    private FocusSessionPauseRepository pauseRepository;
    private TaskRepository taskRepository;
    private TaskService taskService;
    private FocusSessionService focusSessionService;

    private Task task(Long id, Integer estimatedMinutes, Integer actualMinutes, Area area) {
        Task task = new Task("Task " + id);
        task.setId(id);
        task.setEstimatedMinutes(estimatedMinutes);
        task.setActualMinutes(actualMinutes);
        task.setArea(area);
        return task;
    }

    private FocusSession session(Long id, FocusSessionStatus status, LocalDateTime startedAt) {
        FocusSession session = new FocusSession();
        session.setId(id);
        session.setUserId(USER_ID);
        session.setStatus(status);
        session.setStartedAt(startedAt);
        return session;
    }

    @BeforeEach
    void setUp() {
        focusSessionRepository = mock(FocusSessionRepository.class);
        pauseRepository = mock(FocusSessionPauseRepository.class);
        taskRepository = mock(TaskRepository.class);
        taskService = mock(TaskService.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(focusSessionRepository.save(any(FocusSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pauseRepository.save(any(FocusSessionPause.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pauseRepository.findBySessionIdOrderByPausedAtAsc(any())).thenReturn(List.of());
        when(focusSessionRepository.findFirstByUserIdAndStatusIn(eq(USER_ID), any())).thenReturn(Optional.empty());
        focusSessionService = new FocusSessionService(focusSessionRepository, pauseRepository, taskRepository, taskService, currentUserService);
    }

    @Test
    void startCreatesARunningSessionForTheCurrentUser() {
        FocusSession created = focusSessionService.start(new StartFocusSessionRequest(null));

        assertEquals(USER_ID, created.getUserId());
        assertEquals(FocusSessionStatus.RUNNING, created.getStatus());
        assertNotNull(created.getStartedAt());
    }

    @Test
    void startAbandonsAPreviouslyActiveSession() {
        FocusSession existing = session(9L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusMinutes(15));
        when(focusSessionRepository.findFirstByUserIdAndStatusIn(eq(USER_ID), any())).thenReturn(Optional.of(existing));

        focusSessionService.start(new StartFocusSessionRequest(null));

        assertEquals(FocusSessionStatus.ABANDONED, existing.getStatus());
        assertNotNull(existing.getEndedAt());
        assertEquals(15, existing.getActualMinutes());
        verify(focusSessionRepository, times(2)).save(any(FocusSession.class));
    }

    @Test
    void pauseOnlyAllowedWhileRunning() {
        FocusSession paused = session(1L, FocusSessionStatus.PAUSED, LocalDateTime.now().minusMinutes(5));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(paused));

        assertThrows(IllegalArgumentException.class, () -> focusSessionService.pause(1L));
    }

    @Test
    void pauseCreatesAnOpenPauseIntervalAndMarksSessionPaused() {
        FocusSession running = session(1L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusMinutes(5));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(running));

        FocusSession result = focusSessionService.pause(1L);

        assertEquals(FocusSessionStatus.PAUSED, result.getStatus());
        verify(pauseRepository).save(argThat(pause -> pause.getSession() == running && pause.getResumedAt() == null));
    }

    @Test
    void resumeOnlyAllowedWhilePaused() {
        FocusSession running = session(1L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusMinutes(5));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(running));

        assertThrows(IllegalArgumentException.class, () -> focusSessionService.resume(1L));
    }

    @Test
    void resumeClosesTheOpenPauseInterval() {
        FocusSession paused = session(1L, FocusSessionStatus.PAUSED, LocalDateTime.now().minusMinutes(20));
        FocusSessionPause openPause = new FocusSessionPause();
        openPause.setSession(paused);
        openPause.setPausedAt(LocalDateTime.now().minusMinutes(5));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(paused));
        when(pauseRepository.findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(1L)).thenReturn(Optional.of(openPause));

        FocusSession result = focusSessionService.resume(1L);

        assertEquals(FocusSessionStatus.RUNNING, result.getStatus());
        assertNotNull(openPause.getResumedAt());
    }

    @Test
    void stopOnlyAllowedWhileRunningOrPaused() {
        FocusSession completed = session(1L, FocusSessionStatus.COMPLETED, LocalDateTime.now().minusMinutes(30));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(completed));

        assertThrows(IllegalArgumentException.class, () -> focusSessionService.stop(1L, null));
    }

    @Test
    void stopSubtractsClosedPausedTimeFromTheActiveDuration() {
        FocusSession running = session(1L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusMinutes(60));
        FocusSessionPause closedPause = new FocusSessionPause();
        closedPause.setSession(running);
        closedPause.setPausedAt(LocalDateTime.now().minusMinutes(40));
        closedPause.setResumedAt(LocalDateTime.now().minusMinutes(30));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(running));
        when(pauseRepository.findBySessionIdOrderByPausedAtAsc(1L)).thenReturn(List.of(closedPause));

        FocusSession result = focusSessionService.stop(1L, null);

        assertEquals(FocusSessionStatus.COMPLETED, result.getStatus());
        assertEquals(50, result.getActualMinutes());
    }

    @Test
    void stopWhilePausedCountsTimeOnlyUntilThePauseStarted() {
        FocusSession paused = session(1L, FocusSessionStatus.PAUSED, LocalDateTime.now().minusMinutes(60));
        FocusSessionPause openPause = new FocusSessionPause();
        openPause.setSession(paused);
        openPause.setPausedAt(LocalDateTime.now().minusMinutes(20));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(paused));
        when(pauseRepository.findFirstBySessionIdAndResumedAtIsNullOrderByPausedAtDesc(1L)).thenReturn(Optional.of(openPause));
        when(pauseRepository.findBySessionIdOrderByPausedAtAsc(1L)).thenReturn(List.of(openPause));

        FocusSession result = focusSessionService.stop(1L, null);

        assertEquals(40, result.getActualMinutes());
        assertNotNull(openPause.getResumedAt());
    }

    @Test
    void stopCapsActualMinutesToAvoidCountingAnAbandonedBrowserTabAsFocusTime() {
        FocusSession running = session(1L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusHours(20));
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(running));

        FocusSession result = focusSessionService.stop(1L, null);

        assertEquals(480, result.getActualMinutes());
    }

    @Test
    void stopAddsActualMinutesToTheLinkedTaskAndCanCompleteIt() {
        FocusSession running = session(1L, FocusSessionStatus.RUNNING, LocalDateTime.now().minusMinutes(30));
        running.setTaskId(5L);
        Task linkedTask = task(5L, 60, 10, Area.WORK);
        when(focusSessionRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(running));
        when(taskRepository.findById(5L)).thenReturn(Optional.of(linkedTask));

        focusSessionService.stop(1L, new StopFocusSessionRequest("Made progress", true));

        assertEquals(40, linkedTask.getActualMinutes());
        verify(taskRepository).save(linkedTask);
        verify(taskService).markComplete(5L);
    }

    @Test
    void analyticsAggregatesMinutesByDayAndAreaAndFlagsEstimateDivergence() {
        LocalDateTime day1 = LocalDate.of(2026, 1, 5).atTime(9, 0);
        LocalDateTime day2 = LocalDate.of(2026, 1, 6).atTime(14, 0);
        FocusSession session1 = session(1L, FocusSessionStatus.COMPLETED, day1);
        session1.setTaskId(1L);
        session1.setActualMinutes(30);
        session1.setEndedAt(day1.plusMinutes(30));
        FocusSession session2 = session(2L, FocusSessionStatus.COMPLETED, day2);
        session2.setTaskId(2L);
        session2.setActualMinutes(90);
        session2.setEndedAt(day2.plusMinutes(90));

        when(focusSessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(USER_ID), any(), any()))
                .thenReturn(List.of(session1, session2));
        when(taskRepository.findAllById(any())).thenReturn(List.of(
                task(1L, 30, null, Area.WORK),
                task(2L, 20, null, Area.PERSONAL)
        ));

        FocusAnalyticsResponse analytics = focusSessionService.getAnalytics(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertEquals(120, analytics.totalMinutes());
        assertEquals(2, analytics.sessionCount());
        assertEquals(30, analytics.minutesByDay().get("2026-01-05"));
        assertEquals(90, analytics.minutesByDay().get("2026-01-06"));
        assertEquals(30, analytics.minutesByArea().get("WORK"));
        assertEquals(90, analytics.minutesByArea().get("PERSONAL"));
        assertEquals(14, analytics.mostProductiveHour());
        assertEquals(1, analytics.estimateDivergences().size());
        assertEquals(2L, analytics.estimateDivergences().get(0).taskId());
    }
}
