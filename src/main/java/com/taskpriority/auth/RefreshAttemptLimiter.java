package com.taskpriority.auth;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Best-effort, in-memory fixed-window limiter for failed refresh-token attempts, keyed by client
 * IP. Not distributed - each instance in a multi-instance deployment tracks its own counters - but
 * that's an acceptable trade-off for slowing down brute-force/guessing attempts against a single
 * endpoint rather than a strict security boundary (refresh tokens are 256-bit random values, so
 * guessing one is already computationally infeasible; this limiter mainly protects against a
 * compromised-but-already-revoked token being hammered in a retry loop).
 */
@Component
public class RefreshAttemptLimiter {
    private static final int MAX_FAILED_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(5);

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        Window window = windows.get(key);
        return window != null && !window.isExpired() && window.failures >= MAX_FAILED_ATTEMPTS;
    }

    public void recordFailure(String key) {
        windows.compute(key, (ignored, existing) -> {
            if (existing == null || existing.isExpired()) {
                return new Window(Instant.now(), 1);
            }
            existing.failures++;
            return existing;
        });
    }

    public void recordSuccess(String key) {
        windows.remove(key);
    }

    private static final class Window {
        final Instant windowStart;
        int failures;

        Window(Instant windowStart, int failures) {
            this.windowStart = windowStart;
            this.failures = failures;
        }

        boolean isExpired() {
            return Instant.now().isAfter(windowStart.plus(WINDOW));
        }
    }
}
