package com.taskpriority.auth;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

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
}
