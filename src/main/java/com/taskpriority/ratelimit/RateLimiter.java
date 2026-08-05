package com.taskpriority.ratelimit;

/**
 * Bounded fixed-window rate limiter. Implementations must be safe under concurrent callers
 * incrementing the same key (see {@link RedisRateLimiter} and {@link LocalRateLimiter}).
 */
public interface RateLimiter {
    /**
     * Atomically records one attempt against {@code key} and reports whether it is within
     * {@code policy}. A caller that decides not to "spend" an attempt for an outcome that
     * shouldn't count (e.g. a successful login) should use {@link #reset(String)} instead.
     */
    RateLimitDecision consume(String key, RateLimitPolicy policy);

    /**
     * Clears any recorded attempts for {@code key} - e.g. on successful authentication, so a
     * legitimate user who mistyped their password a few times isn't left throttled.
     */
    void reset(String key);
}
