package com.taskpriority.auth;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.common.exception.TooManyRequestsException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
@Tag(name = "Auth", description = "Registration, login, token refresh, and logout.")
public class AuthController {
    // Scoped to /api/v1/auth so the browser only ever attaches this cookie to the endpoints that
    // actually need it, not every request to the API.
    static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final String REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final RefreshAttemptLimiter refreshAttemptLimiter;
    private final long refreshTokenTtlDays;
    private final boolean secureCookies;
    private final String sameSitePolicy;

    public AuthController(
            AuthService authService,
            CurrentUserService currentUserService,
            RefreshAttemptLimiter refreshAttemptLimiter,
            @Value("${app.security.jwt.refresh-token-ttl-days:30}") long refreshTokenTtlDays,
            @Value("${app.security.cookies.secure:true}") boolean secureCookies,
            @Value("${app.security.cookies.same-site:Lax}") String sameSitePolicy
    ) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.refreshAttemptLimiter = refreshAttemptLimiter;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
        this.secureCookies = secureCookies;
        this.sameSitePolicy = sameSitePolicy;
    }

    @Operation(summary = "Register a new user", description = "Creates a user account and returns an access token + user. The refresh token is set as an HttpOnly cookie, never returned in the response body. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User registered"),
            @ApiResponse(responseCode = "400", description = "Validation error or email already in use", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/register")
    public ResponseEntity<AuthResponseBody> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse result = authService.register(request);
        return withRefreshCookie(ResponseEntity.status(HttpStatus.CREATED), result);
    }

    @Operation(summary = "Log in", description = "Authenticates with email/password and returns an access token + user. The refresh token is set as an HttpOnly cookie, never returned in the response body. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "400", description = "Invalid credentials", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponseBody> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse result = authService.login(request);
        return withRefreshCookie(ResponseEntity.ok(), result);
    }

    @Operation(summary = "Refresh an access token", description = "Exchanges the refresh token cookie for a new access token + user, rotating the cookie. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token refreshed"),
            @ApiResponse(responseCode = "400", description = "Missing, invalid, expired, or revoked refresh token cookie", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Too many failed refresh attempts from this client", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseBody> refresh(
            @CookieValue(name = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshTokenCookie,
            HttpServletRequest httpRequest
    ) {
        String clientKey = httpRequest.getRemoteAddr();
        if (refreshAttemptLimiter.isBlocked(clientKey)) {
            throw new TooManyRequestsException("Too many failed refresh attempts. Try again later.");
        }
        if (refreshTokenCookie == null || refreshTokenCookie.isBlank()) {
            refreshAttemptLimiter.recordFailure(clientKey);
            throw new IllegalArgumentException("Invalid or expired refresh token.");
        }
        try {
            AuthResponse result = authService.refresh(refreshTokenCookie);
            refreshAttemptLimiter.recordSuccess(clientKey);
            return withRefreshCookie(ResponseEntity.ok(), result);
        } catch (IllegalArgumentException ex) {
            refreshAttemptLimiter.recordFailure(clientKey);
            throw ex;
        }
    }

    @Operation(summary = "Log out", description = "Revokes the refresh token from the cookie (if present) and clears the cookie. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Logged out")
    })
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshTokenCookie) {
        if (refreshTokenCookie != null && !refreshTokenCookie.isBlank()) {
            authService.logout(refreshTokenCookie);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
                .build();
    }

    @Operation(summary = "Log out all sessions", description = "Revokes every refresh token for the current user, signing out all devices, and clears this browser's cookie. Requires a bearer token to identify the current user.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "All sessions logged out"),
            @ApiResponse(responseCode = "401", description = "Authentication is required", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll() {
        authService.logoutAll(currentUserService.requireUserId());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
                .build();
    }

    private ResponseEntity<AuthResponseBody> withRefreshCookie(ResponseEntity.BodyBuilder responseBuilder, AuthResponse result) {
        return responseBuilder
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
                .body(AuthResponseBody.from(result));
    }

    private ResponseCookie refreshCookie(String rawRefreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSitePolicy)
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(Duration.ofDays(refreshTokenTtlDays))
                .build();
    }

    private ResponseCookie expiredRefreshCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSitePolicy)
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
