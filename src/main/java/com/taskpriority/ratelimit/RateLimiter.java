package com.taskpriority.ratelimit;

/**
 * Bounded fixed-window rate limiter. Implementations must be safe under concurrent callers
 * incrementing or refunding the same key (see {@link RedisRateLimiter} and
 * {@link LocalRateLimiter}).
 */
public interface RateLimiter {
    /**
     * Atomically records one attempt against {@code key} and reports whether it is within
     * {@code policy}.
     */
    RateLimitDecision consume(String key, RateLimitPolicy policy);

    /**
     * Atomically removes only one previously consumed attempt. This is used when a request that
     * had to reserve capacity before authentication later succeeds: refunding that request must
     * not erase failures created by other requests sharing the same IP bucket.
     */
    void refund(String key);

    /**
     * Clears the entire bucket. Use this only when every attempt represented by the key belongs to
     * the successfully authenticated identity, such as a normalized per-account login bucket.
     */
    void reset(String key);
}
