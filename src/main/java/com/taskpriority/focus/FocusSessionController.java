package com.taskpriority.focus;

import com.taskpriority.model.FocusSession;
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

    @PostMapping
    public ResponseEntity<FocusSessionResponse> start(@Validated @RequestBody StartFocusSessionRequest request) {
        FocusSession session = focusSessionService.start(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(session));
    }

    @GetMapping("/active")
    public ResponseEntity<FocusSessionResponse> active() {
        FocusSession session = focusSessionService.findActive();
        return session == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(toResponse(session));
    }

    @GetMapping
    public List<FocusSessionResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.plusDays(1).atStartOfDay();
        return focusSessionService.findInRange(fromDateTime, toDateTime).stream().map(this::toResponse).toList();
    }

    @GetMapping("/analytics")
    public FocusAnalyticsResponse analytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return focusSessionService.getAnalytics(from, to);
    }

    @PatchMapping("/{id}/pause")
    public FocusSessionResponse pause(@PathVariable Long id) {
        return toResponse(focusSessionService.pause(id));
    }

    @PatchMapping("/{id}/resume")
    public FocusSessionResponse resume(@PathVariable Long id) {
        return toResponse(focusSessionService.resume(id));
    }

    @PatchMapping("/{id}/stop")
    public FocusSessionResponse stop(@PathVariable Long id, @Validated @RequestBody(required = false) StopFocusSessionRequest request) {
        return toResponse(focusSessionService.stop(id, request));
    }
}
