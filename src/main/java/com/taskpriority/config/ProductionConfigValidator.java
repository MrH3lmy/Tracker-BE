package com.taskpriority.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fail-fast checks for the {@code prod} profile that a bare placeholder cannot express on its
 * own (issue #259). Database and CORS presence are enforced by
 * {@code application-prod.properties}; this validator handles semantic checks and verifies the
 * effective {@code spring.data.redis.host} property. Inspecting the effective property allows
 * deployments to supply it through {@code REDIS_HOST}, {@code SPRING_DATA_REDIS_HOST}, a command-
 * line argument, or another higher-precedence Spring property source without coupling validation
 * to one environment-variable alias.
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
            @Value("${spring.data.redis.host:}") String redisHost,
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
            errors.add("spring.data.redis.host (REDIS_HOST) must be set explicitly.");
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
