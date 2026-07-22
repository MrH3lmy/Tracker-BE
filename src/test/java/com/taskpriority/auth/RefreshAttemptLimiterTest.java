package com.taskpriority.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshAttemptLimiterTest {

    @Test
    void allowsRequestsUnderTheFailureThreshold() {
        RefreshAttemptLimiter limiter = new RefreshAttemptLimiter();
        for (int i = 0; i < 9; i++) {
            limiter.recordFailure("1.2.3.4");
        }

        assertFalse(limiter.isBlocked("1.2.3.4"));
    }

    @Test
    void blocksOnceTheFailureThresholdIsReached() {
        RefreshAttemptLimiter limiter = new RefreshAttemptLimiter();
        for (int i = 0; i < 10; i++) {
            limiter.recordFailure("1.2.3.4");
        }

        assertTrue(limiter.isBlocked("1.2.3.4"));
    }

    @Test
    void tracksEachKeyIndependently() {
        RefreshAttemptLimiter limiter = new RefreshAttemptLimiter();
        for (int i = 0; i < 10; i++) {
            limiter.recordFailure("1.2.3.4");
        }

        assertTrue(limiter.isBlocked("1.2.3.4"));
        assertFalse(limiter.isBlocked("5.6.7.8"));
    }

    @Test
    void successResetsTheFailureCount() {
        RefreshAttemptLimiter limiter = new RefreshAttemptLimiter();
        for (int i = 0; i < 9; i++) {
            limiter.recordFailure("1.2.3.4");
        }
        limiter.recordSuccess("1.2.3.4");
        limiter.recordFailure("1.2.3.4");

        assertFalse(limiter.isBlocked("1.2.3.4"));
    }
}
