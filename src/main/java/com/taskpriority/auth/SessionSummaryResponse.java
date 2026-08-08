package com.taskpriority.auth;

import com.taskpriority.model.Platform;
import com.taskpriority.model.UserSession;

import java.time.LocalDateTime;

/**
 * Device/session metadata exposed via {@code GET /api/v1/auth/sessions} - deliberately excludes
 * {@code tokenHash} and {@code familyId}, which are internal to the rotation/replay-detection
 * model and never need to leave the server.
 */
public record SessionSummaryResponse(
        Long id,
        String deviceLabel,
        Platform platform,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt,
        LocalDateTime expiresAt
) {
    static SessionSummaryResponse from(UserSession session) {
        return new SessionSummaryResponse(
                session.getId(),
                session.getDeviceLabel(),
                session.getPlatform(),
                session.getCreatedAt(),
                session.getLastUsedAt(),
                session.getExpiresAt()
        );
    }
}
