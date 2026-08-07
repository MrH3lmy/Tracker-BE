package com.taskpriority.ratelimit;

/**
 * Outcome of a single rate-limit check. {@code retryAfterSeconds} is only meaningful when
 * {@code allowed} is false - it is the time remaining until the current fixed window resets.
 */
public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {
    public static RateLimitDecision allow() {
        return new RateLimitDecision(true, 0);
    }

    public static RateLimitDecision deny(long retryAfterSeconds) {
        return new RateLimitDecision(false, retryAfterSeconds);
    }
}
