package com.taskpriority.ratelimit;

import java.time.Duration;

/**
 * A fixed-window rate-limit policy: at most {@code maxAttempts} within {@code window}.
 */
public record RateLimitPolicy(int maxAttempts, Duration window) {
    public RateLimitPolicy {
        if (maxAttempts <= 0) {
            throw new IllegalArgumentException("maxAttempts must be positive");
        }
        if (window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("window must be positive");
        }
    }
}
