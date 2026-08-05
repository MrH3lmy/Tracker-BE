package com.taskpriority.ratelimit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class RateLimiterConfig {

    /**
     * Distributed, multi-instance limiter - the production default. Requires a reachable Redis
     * (see {@code spring.data.redis.*}); if Redis is briefly unreachable, {@link RedisRateLimiter}
     * fails open rather than blocking authentication entirely.
     */
    @Bean
    @ConditionalOnProperty(prefix = "app.rate-limit", name = "redis-enabled", havingValue = "true", matchIfMissing = true)
    public RateLimiter redisRateLimiter(StringRedisTemplate redisTemplate) {
        return new RedisRateLimiter(redisTemplate);
    }

    /**
     * Single-instance fallback for local development and tests, where standing up Redis just to
     * exercise auth endpoints is unnecessary overhead - see the "local-test" Spring profile.
     */
    @Bean
    @ConditionalOnProperty(prefix = "app.rate-limit", name = "redis-enabled", havingValue = "false")
    public RateLimiter localRateLimiter() {
        return new LocalRateLimiter();
    }
}
