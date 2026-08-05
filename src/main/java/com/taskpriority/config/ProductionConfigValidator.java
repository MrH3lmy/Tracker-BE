package com.taskpriority.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fail-fast checks for the {@code prod} profile that a bare {@code ${VAR}} placeholder can't
 * express on its own (issue #259). Presence of required variables (DB connection, CORS origins,
 * Redis host, JWT secret) is already enforced by {@code application-prod.properties} using
 * no-default placeholders - Spring itself refuses to start if one is missing, naming the property
 * without needing custom code. This validator covers the checks that need actual logic: rejecting
 * a wildcard CORS origin, and sanity-bounding the outbox dispatcher's batch/retry/timeout
 * settings. Every failure message names the offending property, never its value - some of these
 * (CORS origins) aren't secret, but treating every production-config error message the same way
 * avoids an easy mistake of adding a secret-revealing message here later.
 */
@Component
@Profile("prod")
public class ProductionConfigValidator {
    private final List<String> corsAllowedOrigins;
    private final int notificationsDispatchBatchSize;
    private final int notificationsMaxDispatchAttempts;
    private final int notificationsProcessingLeaseTimeoutMinutes;

    public ProductionConfigValidator(
            @Value("${app.cors.allowed-origins}") List<String> corsAllowedOrigins,
            @Value("${app.notifications.dispatch-batch-size:50}") int notificationsDispatchBatchSize,
            @Value("${app.notifications.max-dispatch-attempts:5}") int notificationsMaxDispatchAttempts,
            @Value("${app.notifications.processing-lease-timeout-minutes:5}") int notificationsProcessingLeaseTimeoutMinutes
    ) {
        this.corsAllowedOrigins = corsAllowedOrigins;
        this.notificationsDispatchBatchSize = notificationsDispatchBatchSize;
        this.notificationsMaxDispatchAttempts = notificationsMaxDispatchAttempts;
        this.notificationsProcessingLeaseTimeoutMinutes = notificationsProcessingLeaseTimeoutMinutes;
    }

    @PostConstruct
    void validate() {
        List<String> errors = new ArrayList<>();

        if (corsAllowedOrigins.isEmpty() || corsAllowedOrigins.stream().anyMatch(String::isBlank)) {
            errors.add("app.cors.allowed-origins (CORS_ALLOWED_ORIGINS) must not be empty or contain a blank entry.");
        }
        if (corsAllowedOrigins.stream().anyMatch(origin -> origin.contains("*"))) {
            errors.add("app.cors.allowed-origins (CORS_ALLOWED_ORIGINS) must not contain a wildcard origin in production.");
        }

        if (notificationsDispatchBatchSize <= 0) {
            errors.add("app.notifications.dispatch-batch-size (NOTIFICATIONS_DISPATCH_BATCH_SIZE) must be positive.");
        }
        if (notificationsMaxDispatchAttempts <= 0) {
            errors.add("app.notifications.max-dispatch-attempts (NOTIFICATIONS_MAX_DISPATCH_ATTEMPTS) must be positive.");
        }
        if (notificationsProcessingLeaseTimeoutMinutes <= 0) {
            errors.add("app.notifications.processing-lease-timeout-minutes (NOTIFICATIONS_PROCESSING_LEASE_TIMEOUT_MINUTES) must be positive.");
        }

        if (!errors.isEmpty()) {
            throw new IllegalStateException("Invalid production configuration:\n  - " + String.join("\n  - ", errors));
        }
    }
}
