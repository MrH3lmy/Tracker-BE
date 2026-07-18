package com.taskpriority.entitlement;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Tier;
import com.taskpriority.model.UserSession;
import com.taskpriority.repository.NoteAiGenerationRepository;
import com.taskpriority.repository.NoteAttachmentRepository;
import com.taskpriority.repository.NoteSavedViewRepository;
import com.taskpriority.repository.UserSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * Single place owning "what does FREE vs PREMIUM mean numerically" for gates that aren't a
 * simple binary endpoint (see {@link RequiresTier} for those). PREMIUM users are unlimited on
 * every check here.
 */
@Service
public class EntitlementService {
    private final CurrentUserService currentUserService;
    private final UserSessionRepository userSessionRepository;
    private final NoteAiGenerationRepository noteAiGenerationRepository;
    private final NoteAttachmentRepository noteAttachmentRepository;
    private final NoteSavedViewRepository noteSavedViewRepository;
    private final int freeMaxActiveSessions;
    private final int freeMonthlyAiQuota;
    private final long freeStorageQuotaBytes;
    private final int freeMaxSavedViews;

    public EntitlementService(
            CurrentUserService currentUserService,
            UserSessionRepository userSessionRepository,
            NoteAiGenerationRepository noteAiGenerationRepository,
            NoteAttachmentRepository noteAttachmentRepository,
            NoteSavedViewRepository noteSavedViewRepository,
            @Value("${app.entitlement.session-cap.free-max-active:1}") int freeMaxActiveSessions,
            @Value("${app.entitlement.ai-quota.free-monthly-limit:20}") int freeMonthlyAiQuota,
            @Value("${app.entitlement.storage-quota.free-bytes:104857600}") long freeStorageQuotaBytes,
            @Value("${app.entitlement.saved-view-cap.free-max:1}") int freeMaxSavedViews
    ) {
        this.currentUserService = currentUserService;
        this.userSessionRepository = userSessionRepository;
        this.noteAiGenerationRepository = noteAiGenerationRepository;
        this.noteAttachmentRepository = noteAttachmentRepository;
        this.noteSavedViewRepository = noteSavedViewRepository;
        this.freeMaxActiveSessions = freeMaxActiveSessions;
        this.freeMonthlyAiQuota = freeMonthlyAiQuota;
        this.freeStorageQuotaBytes = freeStorageQuotaBytes;
        this.freeMaxSavedViews = freeMaxSavedViews;
    }

    /**
     * Called from {@code AuthService} at login/refresh time, before any access token exists -
     * cannot rely on {@link CurrentUserService} here, so userId/tier are passed explicitly from
     * the already-loaded {@code User}. FREE tier is capped at one active device: rather than
     * blocking the new login, the oldest active session is evicted to make room.
     */
    public void enforceSessionCap(Long userId, Tier tier) {
        if (tier == Tier.PREMIUM) return;
        LocalDateTime now = LocalDateTime.now();
        List<UserSession> active = userSessionRepository
                .findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(userId, now);
        int toEvict = active.size() - (freeMaxActiveSessions - 1);
        for (int i = 0; i < toEvict && i < active.size(); i++) {
            UserSession oldest = active.get(i);
            oldest.setRevoked(true);
            userSessionRepository.save(oldest);
        }
    }

    public void assertWithinAiQuota() {
        var user = currentUserService.requireUser();
        if (user.tier() == Tier.PREMIUM) return;
        LocalDateTime startOfMonth = LocalDateTime.now().with(TemporalAdjusters.firstDayOfMonth()).toLocalDate().atStartOfDay();
        long usedThisMonth = noteAiGenerationRepository.countByUserIdAndCreatedAtAfter(user.userId(), startOfMonth);
        if (usedThisMonth >= freeMonthlyAiQuota) {
            throw new EntitlementException(
                    "You've used your " + freeMonthlyAiQuota + " free AI generations for this month. Upgrade to Premium for unlimited AI actions.");
        }
    }

    public void assertWithinStorageQuota(long incomingBytes) {
        var user = currentUserService.requireUser();
        if (user.tier() == Tier.PREMIUM) return;
        long used = noteAttachmentRepository.sumSizeBytesByUserId(user.userId());
        if (used + incomingBytes > freeStorageQuotaBytes) {
            throw new EntitlementException(
                    "This upload would exceed your free storage quota. Upgrade to Premium for more storage.");
        }
    }

    public void assertWithinSavedViewCap() {
        var user = currentUserService.requireUser();
        if (user.tier() == Tier.PREMIUM) return;
        long existing = noteSavedViewRepository.countByUserId(user.userId());
        if (existing >= freeMaxSavedViews) {
            throw new EntitlementException(
                    "Free accounts are limited to " + freeMaxSavedViews + " saved view(s). Upgrade to Premium for unlimited saved views.");
        }
    }
}
