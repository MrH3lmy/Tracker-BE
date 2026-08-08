package com.taskpriority.auth;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.ratelimit.AuthRateLimitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The explicit, server-controlled native-client authentication contract (issue #257): a dedicated
 * route tree, never inferred from {@code User-Agent} or any other spoofable header. This is a
 * public-client contract - there is no client secret, and none should ever be embedded in a
 * native/Flutter build, which cannot protect a static secret.
 * <p>
 * The only functional difference from {@link AuthController}'s browser flow is where the refresh
 * token travels: here it's a field in the JSON request/response body (for the client to persist
 * in OS-backed secure storage - Keychain/Keystore/platform equivalents), never an
 * {@code HttpOnly} cookie. Everything else - rotation, replay-family detection, session cap,
 * rate limiting - is the exact same {@link AuthService} code path the browser flow uses.
 * <p>
 * No {@code Origin} check runs here (contrast {@link AuthController#rejectDisallowedOrigin}):
 * that defense exists only because the browser flow authenticates off an ambient cookie a
 * malicious page could trigger cross-site. A native client must copy its refresh token into the
 * request body explicitly, which a browser page has no way to do on the user's behalf, so CSRF
 * does not apply to this contract at all.
 */
@RestController
@RequestMapping("/api/v1/auth/native")
@Validated
@Tag(name = "Auth (native)", description = "Dedicated authentication contract for first-party native/desktop clients. The refresh token travels in the JSON body, not a cookie.")
public class NativeAuthController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final AuthRateLimitService rateLimitService;

    public NativeAuthController(
            AuthService authService,
            CurrentUserService currentUserService,
            AuthRateLimitService rateLimitService
    ) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.rateLimitService = rateLimitService;
    }

    @Operation(summary = "Register a new user (native)", description = "Creates a user account and returns an access token, refresh token, and user in the JSON body. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User registered"),
            @ApiResponse(responseCode = "400", description = "Validation error or email already in use", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Too many attempts from this client", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody NativeRegisterRequest request, HttpServletRequest httpRequest) {
        rateLimitService.enforceRegister(httpRequest);
        AuthResponse result = authService.register(request.toRegisterRequest(), request.platform());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @Operation(summary = "Log in (native)", description = "Authenticates with email/password and returns an access token, refresh token, and user in the JSON body. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "400", description = "Invalid credentials", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Too many attempts from this client", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody NativeLoginRequest request, HttpServletRequest httpRequest) {
        rateLimitService.enforceLogin(httpRequest, request.email());
        AuthResponse result = authService.login(request.toLoginRequest(), request.platform());
        rateLimitService.recordLoginSuccess(httpRequest, request.email());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Refresh an access token (native)", description = "Exchanges a refresh token from the request body for a new access token + atomically rotated refresh token + user. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token refreshed"),
            @ApiResponse(responseCode = "400", description = "Missing, invalid, expired, or already-rotated (replayed) refresh token", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Too many failed refresh attempts from this client", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody NativeRefreshRequest request, HttpServletRequest httpRequest) {
        rateLimitService.enforceRefresh(httpRequest);
        AuthResponse result = authService.refresh(request.refreshToken());
        rateLimitService.recordRefreshSuccess(httpRequest);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Log out (native)", description = "Revokes the refresh token in the request body, if present. Best-effort: a missing/blank token is still a 204, not an error. Public endpoint, no bearer token required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Logged out")
    })
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) NativeLogoutRequest request) {
        String refreshToken = request == null ? null : request.refreshToken();
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Log out all sessions (native)", description = "Revokes every refresh token for the current user, across every platform/device. Requires a bearer token to identify the current user.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "All sessions logged out"),
            @ApiResponse(responseCode = "401", description = "Authentication is required", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll() {
        authService.logoutAll(currentUserService.requireUserId());
        return ResponseEntity.noContent().build();
    }
}
