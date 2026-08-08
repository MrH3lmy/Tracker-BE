package com.taskpriority.auth;

import com.taskpriority.common.exception.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Device/session metadata and targeted revocation (issue #257) - "sign out that one lost phone"
 * without a full logout-all. Channel-agnostic: it works the same whether the caller authenticated
 * through the browser cookie flow or a native route, since both issue the same
 * bearer-token-carrying access token this endpoint is gated on.
 */
@RestController
@RequestMapping("/api/v1/auth/sessions")
@Tag(name = "Auth", description = "Registration, login, token refresh, and logout.")
public class AuthSessionsController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;

    public AuthSessionsController(AuthService authService, CurrentUserService currentUserService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "List active sessions", description = "Every active (unrevoked, unexpired) session for the current user, across every device/platform, oldest-activity-first. Requires a bearer token.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active sessions"),
            @ApiResponse(responseCode = "401", description = "Authentication is required", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping
    public List<SessionSummaryResponse> listSessions() {
        return authService.listActiveSessions(currentUserService.requireUserId());
    }

    @Operation(summary = "Revoke a session", description = "Signs out one specific device/session by id, without touching the caller's other sessions. Requires a bearer token; a session belonging to another user is reported as not found.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Session revoked"),
            @ApiResponse(responseCode = "401", description = "Authentication is required", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "No such session for the current user", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> revokeSession(@PathVariable Long sessionId) {
        authService.revokeSession(currentUserService.requireUserId(), sessionId);
        return ResponseEntity.noContent().build();
    }
}
