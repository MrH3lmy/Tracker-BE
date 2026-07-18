package com.taskpriority.entitlement;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.UserSession;
import com.taskpriority.repository.NoteAiGenerationRepository;
import com.taskpriority.repository.NoteAttachmentRepository;
import com.taskpriority.repository.NoteSavedViewRepository;
import com.taskpriority.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EntitlementServiceTest {
    private CurrentUserService currentUserService;
    private UserSessionRepository userSessionRepository;
    private NoteAiGenerationRepository noteAiGenerationRepository;
    private NoteAttachmentRepository noteAttachmentRepository;
    private NoteSavedViewRepository noteSavedViewRepository;
    private EntitlementService entitlementService;

    private static final int FREE_MAX_SESSIONS = 1;
    private static final int FREE_AI_QUOTA = 20;
    private static final long FREE_STORAGE_BYTES = 100L;
    private static final int FREE_SAVED_VIEW_MAX = 1;

    @BeforeEach
    void setUp() {
        currentUserService = mock(CurrentUserService.class);
        userSessionRepository = mock(UserSessionRepository.class);
        noteAiGenerationRepository = mock(NoteAiGenerationRepository.class);
        noteAttachmentRepository = mock(NoteAttachmentRepository.class);
        noteSavedViewRepository = mock(NoteSavedViewRepository.class);
        entitlementService = new EntitlementService(
                currentUserService, userSessionRepository, noteAiGenerationRepository,
                noteAttachmentRepository, noteSavedViewRepository,
                FREE_MAX_SESSIONS, FREE_AI_QUOTA, FREE_STORAGE_BYTES, FREE_SAVED_VIEW_MAX);
    }

    @Test
    void freeTierEvictsOldestSessionWhenCapReached() {
        UserSession oldest = new UserSession();
        oldest.setId(1L);
        when(userSessionRepository.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(eq(10L), any()))
                .thenReturn(List.of(oldest));

        entitlementService.enforceSessionCap(10L, Tier.FREE);

        verify(userSessionRepository).save(oldest);
        assertDoesNotThrow(oldest::isRevoked);
    }

    @Test
    void premiumTierNeverEvictsSessions() {
        entitlementService.enforceSessionCap(10L, Tier.PREMIUM);
        verify(userSessionRepository, never()).findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(anyLong(), any());
    }

    @Test
    void aiQuotaBlocksFreeUserOverLimit() {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(5L, "u@example.com", Tier.FREE, Role.USER));
        when(noteAiGenerationRepository.countByUserIdAndCreatedAtAfter(eq(5L), any(LocalDateTime.class))).thenReturn((long) FREE_AI_QUOTA);

        assertThrows(EntitlementException.class, () -> entitlementService.assertWithinAiQuota());
    }

    @Test
    void aiQuotaAllowsPremiumUserRegardlessOfUsage() {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(5L, "u@example.com", Tier.PREMIUM, Role.USER));

        assertDoesNotThrow(() -> entitlementService.assertWithinAiQuota());
        verify(noteAiGenerationRepository, never()).countByUserIdAndCreatedAtAfter(anyLong(), any());
    }

    @Test
    void storageQuotaBlocksWhenIncomingBytesExceedFreeCap() {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(5L, "u@example.com", Tier.FREE, Role.USER));
        when(noteAttachmentRepository.sumSizeBytesByUserId(5L)).thenReturn(90L);

        assertThrows(EntitlementException.class, () -> entitlementService.assertWithinStorageQuota(20L));
    }

    @Test
    void savedViewCapBlocksFreeUserAtLimit() {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(5L, "u@example.com", Tier.FREE, Role.USER));
        when(noteSavedViewRepository.countByUserId(5L)).thenReturn((long) FREE_SAVED_VIEW_MAX);

        assertThrows(EntitlementException.class, () -> entitlementService.assertWithinSavedViewCap());
    }
}
