package com.taskpriority.ratelimit;

import com.taskpriority.common.exception.TooManyRequestsException;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthRateLimitServiceTest {
    private RateLimiter rateLimiter;
    private AuthRateLimitService service;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        rateLimiter = mock(RateLimiter.class);
        when(rateLimiter.consume(any(), any())).thenReturn(RateLimitDecision.allow());
        TrustedProxyResolver trustedProxyResolver = new TrustedProxyResolver("");
        MeterRegistry meterRegistry = new SimpleMeterRegistry();
        service = new AuthRateLimitService(rateLimiter, trustedProxyResolver, meterRegistry,
                20, 900, 5, 900, 10, 3600, 10, 300);
        request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
    }

    @Test
    void loginChecksBothIpAndAccountBuckets() {
        service.enforceLogin(request, "User@Example.com");

        verify(rateLimiter).consume(eq("login:ip:203.0.113.5"), any());
        verify(rateLimiter).consume(startsWithAccountKey(), any());
    }

    @Test
    void loginBlockedByIpBucketThrowsWithRetryAfter() {
        when(rateLimiter.consume(eq("login:ip:203.0.113.5"), any())).thenReturn(RateLimitDecision.deny(42));

        TooManyRequestsException ex = assertThrows(TooManyRequestsException.class,
                () -> service.enforceLogin(request, "user@example.com"));

        assertEquals(42, ex.getRetryAfterSeconds());
    }

    @Test
    void differentlyCasedEmailsNormalizeToTheSameAccountKey() {
        org.mockito.ArgumentCaptor<String> consumeKeyCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        service.enforceLogin(request, "  User@Example.com  ");
        verify(rateLimiter, org.mockito.Mockito.atLeastOnce()).consume(consumeKeyCaptor.capture(), any());
        String accountKeyFromEnforce = consumeKeyCaptor.getAllValues().stream()
                .filter(key -> key.startsWith("login:account:"))
                .findFirst()
                .orElseThrow();

        org.mockito.ArgumentCaptor<String> resetKeyCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        service.recordLoginSuccess(request, "user@example.com");
        verify(rateLimiter, org.mockito.Mockito.atLeastOnce()).reset(resetKeyCaptor.capture());
        String accountKeyFromReset = resetKeyCaptor.getAllValues().stream()
                .filter(key -> key.startsWith("login:account:"))
                .findFirst()
                .orElseThrow();

        // Untrimmed/differently-cased input must still hash to the same account key, or a
        // successful login would fail to reset the failure bucket its own earlier attempts built up.
        assertEquals(accountKeyFromEnforce, accountKeyFromReset);
    }

    @Test
    void loginSuccessResetsBothBuckets() {
        service.recordLoginSuccess(request, "user@example.com");

        verify(rateLimiter).reset("login:ip:203.0.113.5");
        verify(rateLimiter).reset(startsWithAccountKey());
    }

    @Test
    void registerChecksOnlyTheIpBucket() {
        service.enforceRegister(request);

        verify(rateLimiter).consume(eq("register:ip:203.0.113.5"), any());
        verify(rateLimiter, never()).consume(startsWithAccountKey(), any());
    }

    @Test
    void refreshChecksTheIpBucketAndSuccessResetsIt() {
        service.enforceRefresh(request);
        service.recordRefreshSuccess(request);

        verify(rateLimiter).consume(eq("refresh:ip:203.0.113.5"), any());
        verify(rateLimiter).reset("refresh:ip:203.0.113.5");
    }

    @Test
    void accountKeyNeverContainsTheRawEmail() {
        service.enforceLogin(request, "someone@example.com");

        org.mockito.ArgumentCaptor<String> keyCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(rateLimiter, org.mockito.Mockito.atLeastOnce()).consume(keyCaptor.capture(), any());
        for (String key : keyCaptor.getAllValues()) {
            org.junit.jupiter.api.Assertions.assertFalse(key.contains("someone@example.com"),
                    "rate-limit key must not contain the raw email: " + key);
        }
    }

    private static String startsWithAccountKey() {
        return org.mockito.ArgumentMatchers.argThat(key -> key != null && key.startsWith("login:account:"));
    }
}
