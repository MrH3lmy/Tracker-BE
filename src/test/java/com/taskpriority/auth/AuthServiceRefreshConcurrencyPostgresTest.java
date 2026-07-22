package com.taskpriority.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression coverage for GitHub issue #223: two concurrent requests presenting the same refresh
 * token must result in exactly one success. This exercises the real atomic conditional UPDATE
 * (UserSessionRepository.consumeByTokenHash) against a real PostgreSQL database with two genuinely
 * concurrent transactions racing for the same session row - an H2-backed unit/slice test can't
 * prove this, since the guarantee comes from Postgres's row-level locking serializing the two
 * UPDATE statements.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class AuthServiceRefreshConcurrencyPostgresTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("taskpriority")
            .withUsername("taskpriority")
            .withPassword("taskpriority");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
    }

    @Autowired
    private AuthService authService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("TRUNCATE TABLE user_sessions, users RESTART IDENTITY CASCADE");
    }

    @Test
    void concurrentRefreshWithTheSameTokenSucceedsExactlyOnce() throws Exception {
        String email = "racer-" + System.nanoTime() + "@example.com";
        AuthResponse initial = authService.register(new RegisterRequest(email, "password123", "Racer", "device-1"));
        String sharedRefreshToken = initial.refreshToken();

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Object> attempt = () -> {
                barrier.await(10, TimeUnit.SECONDS);
                try {
                    return authService.refresh(sharedRefreshToken);
                } catch (IllegalArgumentException ex) {
                    return ex;
                }
            };

            List<Future<Object>> futures = executor.invokeAll(List.of(attempt, attempt));
            Object first = futures.get(0).get(10, TimeUnit.SECONDS);
            Object second = futures.get(1).get(10, TimeUnit.SECONDS);

            long successes = List.of(first, second).stream().filter(r -> r instanceof AuthResponse).count();
            long failures = List.of(first, second).stream().filter(r -> r instanceof IllegalArgumentException).count();

            assertEquals(1, successes, "exactly one of the two concurrent refreshes should succeed");
            assertEquals(1, failures, "the other concurrent refresh should fail with a generic invalid-token error");

            Object failure = first instanceof IllegalArgumentException ? first : second;
            assertEquals("Invalid or expired refresh token.", ((IllegalArgumentException) failure).getMessage());
        } finally {
            executor.shutdownNow();
        }

        Integer activeSessions = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_sessions WHERE revoked = false", Integer.class);
        assertTrue(activeSessions != null && activeSessions == 1,
                "exactly one active session should remain after the race (the new one issued by the winner)");
    }
}
