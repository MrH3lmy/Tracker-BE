package com.taskpriority.auth;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TIER = "tier";
    private static final String CLAIM_ROLE = "role";
    private static final int MIN_SECRET_LENGTH_BYTES = 32;

    private final String secret;
    private final long accessTokenTtlMinutes;
    private SecretKey signingKey;

    public JwtService(
            @Value("${app.security.jwt.secret:}") String secret,
            @Value("${app.security.jwt.access-token-ttl-minutes:15}") long accessTokenTtlMinutes
    ) {
        this.secret = secret;
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
    }

    @PostConstruct
    void init() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_LENGTH_BYTES) {
            throw new IllegalStateException(
                    "app.security.jwt.secret must be set to a random string of at least "
                            + MIN_SECRET_LENGTH_BYTES + " bytes (set the JWT_SECRET environment variable).");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(Long userId, String email, Tier tier, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_TIER, tier.name())
                .claim(CLAIM_ROLE, role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    public Optional<AuthenticatedUser> parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            Long userId = Long.valueOf(claims.getSubject());
            String email = claims.get(CLAIM_EMAIL, String.class);
            Tier tier = Tier.valueOf(claims.get(CLAIM_TIER, String.class));
            Role role = Role.valueOf(claims.get(CLAIM_ROLE, String.class));
            return Optional.of(new AuthenticatedUser(userId, email, tier, role));
        } catch (RuntimeException ex) {
            // Any malformed token (missing/blank claims, bad subject format, etc.) should be
            // treated as "not authenticated", never bubble up: this filter runs on every
            // request - including public endpoints like /api/v1/auth/login - and an uncaught
            // exception here escapes past the CorsFilter, stripping CORS headers from the
            // response and surfacing as a misleading browser CORS error instead of a clean 401.
            return Optional.empty();
        }
    }
}
