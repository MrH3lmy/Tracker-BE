package com.taskpriority.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fail-fast checks for the {@code prod} profile that a bare {@code ${VAR}} placeholder can't
 * express on its own, or that turned out not to actually enforce presence reliably (issue #259).
 * Presence of the database connection and CORS origins is enforced by
 * {@code application-prod.properties} using no-default placeholders - Spring itself refuses to
 * start if one is missing. {@code spring.data.redis.host} looked like it would work the same way,
 * but {@code RedisProperties} binds it with a Java-level default ({@code "localhost"}) that
 * silently wins when the placeholder can't resolve instead of propagating a failure - proven by
 * this exact scenario failing to fail in {@code ProductionProfileStartupPostgresTest} against a
 * real Spring context, so it's re-checked here directly against the raw env var instead of trusting
 * the placeholder. Every failure message names the offending property, never its value - some of
 * these (CORS origins, Redis host) aren't secret, but treating every production-config error
 * message the same way avoids an easy mistake of adding a secret-revealing message here later.
 */
@Component
@Profile("prod")
public class ProductionConfigValidator {
    private final List<String> corsAllowedOrigins;
    private final String redisHost;
    private final int notificationsDispatchBatchSize;
    private final int notificationsMaxDispatchAttempts;
    private final int notificationsProcessingLeaseTimeoutMinutes;

    public ProductionConfigValidator(
            @Value("${app.cors.allowed-origins}") List<String> corsAllowedOrigins,
            @Value("${REDIS_HOST:}") String redisHost,
            @Value("${app.notifications.dispatch-batch-size:50}") int notificationsDispatchBatchSize,
            @Value("${app.notifications.max-dispatch-attempts:5}") int notificationsMaxDispatchAttempts,
            @Value("${app.notifications.processing-lease-timeout-minutes:5}") int notificationsProcessingLeaseTimeoutMinutes
    ) {
        this.corsAllowedOrigins = corsAllowedOrigins;
        this.redisHost = redisHost;
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

        if (redisHost.isBlank()) {
            errors.add("REDIS_HOST must be set explicitly (spring.data.redis.host must not silently fall back to its localhost default).");
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
