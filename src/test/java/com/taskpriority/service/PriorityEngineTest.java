package com.taskpriority.service;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.*;
import com.taskpriority.repository.PriorityScoringSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PriorityEngineTest {
    private PriorityScoringSettingRepository repo;
    private PriorityEngine engine;

    @BeforeEach
    void setUp() {
        repo = mock(PriorityScoringSettingRepository.class);
        when(repo.findByUserIdAndSettingName(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString())).thenReturn(Optional.empty());
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(1L);
        engine = new PriorityEngine(repo, currentUserService);
    }

    @Test
    void computesWaitingFollowUpAndReasonDeterministically() {
        Task task = new Task("Follow up vendor");
        task.setStatus(Status.WAITING);
        task.setImportant(true);
        task.setEffort(Effort.MEDIUM);
        task.setDueDate(LocalDate.now().plusDays(1));
        task.setFollowUpDate(LocalDate.now());
        task.setCreatedDate(LocalDateTime.now().minusDays(10));

        PriorityEngine.PriorityComputation c = engine.compute(task);
        assertEquals(1, c.daysLeft());
        assertFalse(c.overdue());
        assertTrue(c.urgent());
        assertEquals(82, c.priorityScore());
        assertEquals(PriorityCategory.DO_NOW, c.priorityCategory());
        assertEquals(AgeFlag.AGING, c.ageFlag());
        assertTrue(c.priorityReason().contains("followUp=" + LocalDate.now() + "(+10)"));
    }

    @Test
    void computesBlockedOverdueFollowUpAndStatusPenalty() {
        Task task = new Task("Wait unblock");
        task.setStatus(Status.BLOCKED);
        task.setImportant(false);
        task.setEffort(Effort.LARGE);
        task.setFollowUpDate(LocalDate.now().minusDays(2));
        task.setCreatedDate(LocalDateTime.now().minusDays(40));

        PriorityEngine.PriorityComputation c = engine.compute(task);
        assertNull(c.daysLeft());
        assertFalse(c.overdue());
        assertFalse(c.urgent());
        assertEquals(0, c.priorityScore());
        assertEquals(PriorityCategory.DELETE, c.priorityCategory());
        assertEquals(AgeFlag.STALE, c.ageFlag());
        assertTrue(c.priorityReason().contains("status=BLOCKED"));
    }
}
