package com.taskpriority.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Single-instance, in-memory fixed-window rate limiter. Only appropriate for local development or
 * a genuinely single-instance deployment - counters are not shared across application instances
 * and are lost on restart (see {@link RedisRateLimiter} for the distributed, production-profile
 * implementation).
 * <p>
 * Bounded: unlike the original {@code RefreshAttemptLimiter} this replaces, the tracked-key map
 * has a hard capacity. Once at capacity, a sweep of expired windows runs before a brand-new key is
 * rejected from tracking (and fails open) rather than growing without limit.
 */
public class LocalRateLimiter implements RateLimiter {
    private static final Logger logger = LoggerFactory.getLogger(LocalRateLimiter.class);
    private static final int DEFAULT_MAX_TRACKED_KEYS = 50_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int maxTrackedKeys;

    public LocalRateLimiter() {
        this(DEFAULT_MAX_TRACKED_KEYS);
    }

    // Package-private: lets tests exercise the capacity/eviction path without allocating 50,000
    // entries.
    LocalRateLimiter(int maxTrackedKeys) {
        this.maxTrackedKeys = maxTrackedKeys;
    }

    @Override
    public RateLimitDecision consume(String key, RateLimitPolicy policy) {
        Window window = windows.compute(key, (ignored, existing) -> {
            if (existing == null || existing.isExpired()) {
                return new Window(Instant.now(), policy.window());
            }
            existing.attempts.incrementAndGet();
            return existing;
        });

        if (window.attempts.get() == 1 && windows.size() > maxTrackedKeys) {
            sweepExpired();
            if (windows.size() > maxTrackedKeys) {
                logger.warn("Local rate limiter at capacity ({} tracked keys); not tracking new key (failing open).", maxTrackedKeys);
                windows.remove(key, window);
                return RateLimitDecision.allow();
            }
        }

        if (window.attempts.get() <= policy.maxAttempts()) {
            return RateLimitDecision.allow();
        }
        return RateLimitDecision.deny(window.remainingSeconds());
    }

    @Override
    public void reset(String key) {
        windows.remove(key);
    }

    private void sweepExpired() {
        windows.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    private static final class Window {
        final Instant expiresAt;
        final AtomicInteger attempts = new AtomicInteger(1);

        Window(Instant windowStart, Duration windowLength) {
            this.expiresAt = windowStart.plus(windowLength);
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }

        long remainingSeconds() {
            long seconds = Duration.between(Instant.now(), expiresAt).toSeconds();
            return Math.max(seconds, 0);
        }
    }
}
