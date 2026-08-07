package com.taskpriority.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end coverage for issue #258's 429/Retry-After acceptance criteria, through the real
 * AuthController -> AuthRateLimitService -> LocalRateLimiter path (local-test profile already
 * uses the local, non-Redis limiter - see application-local-test.properties). Tiny policy
 * overrides here keep this fast and deterministic instead of needing dozens of requests to trip
 * the production-sized defaults.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "app.rate-limit.register.ip.max-attempts=2",
        "app.rate-limit.register.ip.window-seconds=60"
})
class AuthRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exceedingTheRegistrationLimitReturns429WithRetryAfter() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerBody(i)))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(99)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    private String registerBody(int suffix) {
        return """
                {"email":"rate-limit-test-%d-%d@example.com","password":"correct-horse"}
                """.formatted(suffix, System.nanoTime());
    }
}
