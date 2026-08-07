package com.taskpriority.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;

import java.util.List;

/**
 * Distributed fixed-window rate limiter shared across every application instance via Redis.
 * Increment-and-expire and single-attempt refunds run as Lua scripts so concurrent requests across
 * instances cannot race past the limit or erase unrelated failures.
 * <p>
 * Fails open: if Redis is unreachable, requests are allowed through rather than blocking every
 * login/registration/refresh on an infrastructure outage - see the README's "Redis failure
 * behavior" note. The failure is logged so it's visible operationally.
 */
public class RedisRateLimiter implements RateLimiter {
    private static final Logger logger = LoggerFactory.getLogger(RedisRateLimiter.class);
    private static final String KEY_PREFIX = "ratelimit:";

    private static final RedisScript<List> INCREMENT_SCRIPT = new DefaultRedisScript<>("""
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            local ttl = redis.call('PTTL', KEYS[1])
            if ttl < 0 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
                ttl = tonumber(ARGV[1])
            end
            return {current, ttl}
            """, List.class);

    private static final RedisScript<Long> REFUND_SCRIPT = new DefaultRedisScript<>("""
            local current = redis.call('GET', KEYS[1])
            if not current then
                return 0
            end
            current = tonumber(current)
            if not current or current <= 1 then
                redis.call('DEL', KEYS[1])
                return 0
            end
            return redis.call('DECR', KEYS[1])
            """, Long.class);

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public RateLimitDecision consume(String key, RateLimitPolicy policy) {
        String redisKey = KEY_PREFIX + key;
        try {
            List<?> result = redisTemplate.execute(
                    INCREMENT_SCRIPT,
                    List.of(redisKey),
                    String.valueOf(policy.window().toMillis()));
            if (result == null || result.size() < 2
                    || !(result.get(0) instanceof Number currentValue)
                    || !(result.get(1) instanceof Number ttlValue)) {
                logger.warn("Redis rate-limit script returned an unexpected result for key hash {}; failing open.", keyHash(key));
                return RateLimitDecision.allow();
            }
            long current = currentValue.longValue();
            long ttlMillis = ttlValue.longValue();
            if (current <= policy.maxAttempts()) {
                return RateLimitDecision.allow();
            }
            long retryAfterSeconds = ttlMillis > 0 ? Math.ceilDiv(ttlMillis, 1000) : policy.window().toSeconds();
            return RateLimitDecision.deny(Math.max(retryAfterSeconds, 1));
        } catch (DataAccessException ex) {
            logger.warn("Redis unavailable for rate limiting (key hash {}); failing open.", keyHash(key), ex);
            return RateLimitDecision.allow();
        }
    }

    @Override
    public void refund(String key) {
        try {
            redisTemplate.execute(REFUND_SCRIPT, List.of(KEY_PREFIX + key));
        } catch (DataAccessException ex) {
            logger.warn("Redis unavailable while refunding rate limit (key hash {}).", keyHash(key), ex);
        }
    }

    @Override
    public void reset(String key) {
        try {
            redisTemplate.delete(KEY_PREFIX + key);
        } catch (DataAccessException ex) {
            logger.warn("Redis unavailable while resetting rate limit (key hash {}).", keyHash(key), ex);
        }
    }

    // Keys can embed IPs (account identifiers are hashed by AuthRateLimitService) - never log them raw.
    private static String keyHash(String key) {
        return Integer.toHexString(key.hashCode());
    }
}
