package com.taskpriority.focus;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.FocusSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/focus-sessions")
@Tag(name = "Focus Sessions", description = "Timed focus/Pomodoro-style work sessions against tasks")
public class FocusSessionController {
    private final FocusSessionService focusSessionService;
    private final FocusSessionApiMapper mapper;

    public FocusSessionController(FocusSessionService focusSessionService, FocusSessionApiMapper mapper) {
        this.focusSessionService = focusSessionService;
        this.mapper = mapper;
    }

    private FocusSessionResponse toResponse(FocusSession session) {
        return mapper.toResponse(session, focusSessionService.findTaskOrNull(session.getTaskId()), focusSessionService.elapsedMinutesNow(session));
    }

    @Operation(summary = "Start a focus session")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Focus session started"),
            @ApiResponse(responseCode = "400", description = "Validation error, e.g. another session is already active", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<FocusSessionResponse> start(@Validated @RequestBody StartFocusSessionRequest request) {
        FocusSession session = focusSessionService.start(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(session));
    }

    @Operation(summary = "Get the active focus session, if any")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active session found"),
            @ApiResponse(responseCode = "204", description = "No focus session is currently active")
    })
    @GetMapping("/active")
    public ResponseEntity<FocusSessionResponse> active() {
        FocusSession session = focusSessionService.findActive();
        return session == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(toResponse(session));
    }

    @Operation(summary = "List focus sessions in a date range")
    @ApiResponse(responseCode = "400", description = "Invalid date range", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping
    public List<FocusSessionResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.plusDays(1).atStartOfDay();
        return focusSessionService.findInRange(fromDateTime, toDateTime).stream().map(this::toResponse).toList();
    }

    @Operation(summary = "Get focus session analytics for a date range", description = "Aggregate stats such as total focused time and session counts.")
    @ApiResponse(responseCode = "400", description = "Invalid date range", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/analytics")
    public FocusAnalyticsResponse analytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return focusSessionService.getAnalytics(from, to);
    }

    @Operation(summary = "Pause a focus session")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Session paused"),
            @ApiResponse(responseCode = "404", description = "Focus session not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/pause")
    public FocusSessionResponse pause(@PathVariable Long id) {
        return toResponse(focusSessionService.pause(id));
    }

    @Operation(summary = "Resume a paused focus session")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Session resumed"),
            @ApiResponse(responseCode = "404", description = "Focus session not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/resume")
    public FocusSessionResponse resume(@PathVariable Long id) {
        return toResponse(focusSessionService.resume(id));
    }

    @Operation(summary = "Stop a focus session")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Session stopped"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Focus session not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/stop")
    public FocusSessionResponse stop(@PathVariable Long id, @Validated @RequestBody(required = false) StopFocusSessionRequest request) {
        return toResponse(focusSessionService.stop(id, request));
    }
}
