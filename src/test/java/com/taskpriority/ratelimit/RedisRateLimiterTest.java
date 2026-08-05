package com.taskpriority.ratelimit;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises RedisRateLimiter against a real Redis, including two independently constructed
 * limiter instances sharing the same Redis - the multi-application-instance scenario issue #258
 * asks for, which an in-memory/mocked test can't prove (the guarantee comes from Redis's own
 * atomic Lua script execution serializing concurrent INCR/EXPIRE, not from anything in-process).
 */
@Testcontainers(disabledWithoutDocker = true)
class RedisRateLimiterTest {

    @Container
    static final GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    private static StringRedisTemplate redisTemplate;

    @BeforeAll
    static void connect() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(redis.getHost(), redis.getMappedPort(6379));
        LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory(config);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
    }

    @Test
    void allowsAttemptsWithinTheLimit() {
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);
        RateLimitPolicy policy = new RateLimitPolicy(3, Duration.ofMinutes(1));
        String key = uniqueKey();

        assertTrue(limiter.consume(key, policy).allowed());
        assertTrue(limiter.consume(key, policy).allowed());
        assertTrue(limiter.consume(key, policy).allowed());
    }

    @Test
    void blocksOnceTheLimitIsExceededAndReportsARetryAfter() {
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);
        RateLimitPolicy policy = new RateLimitPolicy(2, Duration.ofMinutes(1));
        String key = uniqueKey();

        limiter.consume(key, policy);
        limiter.consume(key, policy);
        RateLimitDecision decision = limiter.consume(key, policy);

        assertFalse(decision.allowed());
        assertTrue(decision.retryAfterSeconds() > 0);
        assertTrue(decision.retryAfterSeconds() <= 60);
    }

    @Test
    void expiredWindowsPermitNewRequests() throws InterruptedException {
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);
        RateLimitPolicy policy = new RateLimitPolicy(1, Duration.ofMillis(200));
        String key = uniqueKey();

        limiter.consume(key, policy);
        Thread.sleep(400);

        assertTrue(limiter.consume(key, policy).allowed());
    }

    @Test
    void resetClearsTheCounter() {
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);
        RateLimitPolicy policy = new RateLimitPolicy(1, Duration.ofMinutes(1));
        String key = uniqueKey();

        limiter.consume(key, policy);
        assertFalse(limiter.consume(key, policy).allowed());

        limiter.reset(key);

        assertTrue(limiter.consume(key, policy).allowed());
    }

    @Test
    void twoLimiterInstancesSharingRedisEnforceTheSameLimit() {
        // Simulates two application instances: two independent RedisRateLimiter objects (and two
        // independent connections), both backed by the same Redis - the scenario a single
        // in-process limiter can never prove.
        RedisRateLimiter instanceA = new RedisRateLimiter(redisTemplate);
        RedisRateLimiter instanceB = new RedisRateLimiter(redisTemplate);
        RateLimitPolicy policy = new RateLimitPolicy(5, Duration.ofMinutes(1));
        String key = uniqueKey();

        for (int i = 0; i < 5; i++) {
            RedisRateLimiter instance = (i % 2 == 0) ? instanceA : instanceB;
            assertTrue(instance.consume(key, policy).allowed(), "attempt " + i + " should be allowed");
        }

        assertFalse(instanceA.consume(key, policy).allowed());
        assertFalse(instanceB.consume(key, policy).allowed());
    }

    @Test
    void concurrentAttemptsAcrossInstancesNeverExceedTheConfiguredAllowance() throws Exception {
        RedisRateLimiter instanceA = new RedisRateLimiter(redisTemplate);
        RedisRateLimiter instanceB = new RedisRateLimiter(redisTemplate);
        int maxAttempts = 20;
        RateLimitPolicy policy = new RateLimitPolicy(maxAttempts, Duration.ofMinutes(1));
        String key = uniqueKey();

        int totalCallers = 50;
        CyclicBarrier barrier = new CyclicBarrier(totalCallers);
        ExecutorService executor = Executors.newFixedThreadPool(totalCallers);
        AtomicLong allowedCount = new AtomicLong();
        try {
            Callable<Void> attempt = () -> {
                barrier.await(10, TimeUnit.SECONDS);
                RedisRateLimiter instance = ThreadLocalRandom.current().nextBoolean() ? instanceA : instanceB;
                if (instance.consume(key, policy).allowed()) {
                    allowedCount.incrementAndGet();
                }
                return null;
            };

            var tasks = IntStream.range(0, totalCallers).mapToObj(i -> attempt).toList();
            for (Future<Void> future : executor.invokeAll(tasks)) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertEquals(maxAttempts, allowedCount.get(),
                "exactly maxAttempts requests should succeed across both instances under concurrency, no more");
    }

    private static String uniqueKey() {
        return "test:" + UUID.randomUUID();
    }
}
