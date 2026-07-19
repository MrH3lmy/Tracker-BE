package com.taskpriority.auth;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-signing-secret-at-least-32-bytes-long!!", 15);
        jwtService.init();
    }

    @Test
    void issuedTokenParsesBackToSameUser() {
        String token = jwtService.issueAccessToken(42L, "user@example.com", Tier.PREMIUM, Role.ADMIN);

        Optional<AuthenticatedUser> parsed = jwtService.parseAccessToken(token);

        assertTrue(parsed.isPresent());
        assertEquals(42L, parsed.get().userId());
        assertEquals("user@example.com", parsed.get().email());
        assertEquals(Tier.PREMIUM, parsed.get().tier());
        assertEquals(Role.ADMIN, parsed.get().role());
    }

    @Test
    void garbageTokenFailsToParse() {
        assertTrue(jwtService.parseAccessToken("not-a-real-token").isEmpty());
    }

    @Test
    void tokenSignedWithDifferentSecretFailsToParse() {
        JwtService other = new JwtService("a-completely-different-signing-secret-32b", 15);
        other.init();
        String token = other.issueAccessToken(1L, "a@example.com", Tier.FREE, Role.USER);

        assertTrue(jwtService.parseAccessToken(token).isEmpty());
    }

    // A validly-signed token missing the tier/role claims used to throw a NullPointerException
    // from Enum.valueOf(Tier.class, null) instead of being treated as an unparseable token. Since
    // JwtAuthenticationFilter runs unconditionally on every request - including public endpoints
    // like /api/v1/auth/login - that uncaught exception escaped past the CorsFilter and stripped
    // the response's CORS headers, surfacing to the browser as a misleading CORS error.
    @Test
    void tokenMissingTierAndRoleClaimsFailsToParseInsteadOfThrowing() {
        SecretKey key = Keys.hmacShaKeyFor("test-signing-secret-at-least-32-bytes-long!!".getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String token = Jwts.builder()
                .subject("1")
                .claim("email", "a@example.com")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(15, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();

        assertTrue(assertDoesNotThrow(() -> jwtService.parseAccessToken(token)).isEmpty());
    }
}
