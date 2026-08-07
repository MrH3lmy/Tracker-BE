package com.taskpriority.ratelimit;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalRateLimiterTest {
    private final RateLimitPolicy policy = new RateLimitPolicy(3, Duration.ofMinutes(1));

    @Test
    void allowsAttemptsWithinTheLimit() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        assertTrue(limiter.consume("key", policy).allowed());
        assertTrue(limiter.consume("key", policy).allowed());
        assertTrue(limiter.consume("key", policy).allowed());
    }

    @Test
    void blocksOnceTheLimitIsExceeded() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        limiter.consume("key", policy);
        limiter.consume("key", policy);
        limiter.consume("key", policy);

        RateLimitDecision decision = limiter.consume("key", policy);

        assertFalse(decision.allowed());
        assertTrue(decision.retryAfterSeconds() > 0);
    }

    @Test
    void differentKeysAreTrackedIndependently() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        limiter.consume("alice", policy);
        limiter.consume("alice", policy);
        limiter.consume("alice", policy);

        assertFalse(limiter.consume("alice", policy).allowed());
        assertTrue(limiter.consume("bob", policy).allowed());
    }

    @Test
    void expiredWindowsPermitNewRequests() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        RateLimitPolicy shortWindow = new RateLimitPolicy(1, Duration.ofMillis(1));
        limiter.consume("key", shortWindow);

        await(5);

        assertTrue(limiter.consume("key", shortWindow).allowed());
    }

    @Test
    void refundRemovesOnlyOneConsumedAttempt() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        RateLimitPolicy oneAttempt = new RateLimitPolicy(1, Duration.ofMinutes(1));
        assertTrue(limiter.consume("key", oneAttempt).allowed());
        assertFalse(limiter.consume("key", oneAttempt).allowed());

        limiter.refund("key");

        // One failure remains. A full reset would make this next request allowed; a one-attempt
        // refund correctly takes the counter from two back to one, so the next consume is blocked.
        assertFalse(limiter.consume("key", oneAttempt).allowed());
    }

    @Test
    void resetClearsTheTrackedWindow() {
        LocalRateLimiter limiter = new LocalRateLimiter();
        limiter.consume("key", policy);
        limiter.consume("key", policy);
        limiter.consume("key", policy);
        assertFalse(limiter.consume("key", policy).allowed());

        limiter.reset("key");

        assertTrue(limiter.consume("key", policy).allowed());
    }

    @Test
    void failsOpenForNewKeysOnceAtCapacityWithNothingExpiredToSweep() {
        LocalRateLimiter limiter = new LocalRateLimiter(2);
        RateLimitPolicy longWindow = new RateLimitPolicy(1, Duration.ofMinutes(5));
        limiter.consume("existing-1", longWindow);
        limiter.consume("existing-2", longWindow);

        RateLimitDecision decision = limiter.consume("new-key", longWindow);

        assertTrue(decision.allowed());
        assertTrue(limiter.consume("new-key", longWindow).allowed());
    }

    @Test
    void sweepsExpiredEntriesToMakeRoomBeforeFailingOpen() {
        LocalRateLimiter limiter = new LocalRateLimiter(2);
        RateLimitPolicy expiresImmediately = new RateLimitPolicy(1, Duration.ofMillis(1));
        limiter.consume("expiring-1", expiresImmediately);
        limiter.consume("expiring-2", expiresImmediately);
        await(5);

        RateLimitPolicy longWindow = new RateLimitPolicy(1, Duration.ofMinutes(5));
        assertTrue(limiter.consume("new-key", longWindow).allowed());
        assertFalse(limiter.consume("new-key", longWindow).allowed());
    }

    private static void await(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
