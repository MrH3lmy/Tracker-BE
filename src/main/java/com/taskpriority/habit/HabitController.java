package com.taskpriority.habit;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.Habit;
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
import java.util.List;

@RestController
@RequestMapping("/api/v1/habits")
@Tag(name = "Habits", description = "Recurring habits and their check-in history")
public class HabitController {
    private final HabitService habitService;
    private final HabitApiMapper mapper;

    public HabitController(HabitService habitService, HabitApiMapper mapper) {
        this.habitService = habitService;
        this.mapper = mapper;
    }

    @Operation(summary = "List all habits")
    @GetMapping
    public List<HabitResponse> all() {
        return habitService.findAll().stream().map(mapper::toResponse).toList();
    }

    @Operation(summary = "Get a habit by id")
    @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}")
    public HabitResponse byId(@PathVariable Long id) {
        return mapper.toResponse(habitService.findById(id));
    }

    @Operation(summary = "Get check-in history across all habits", description = "Returns per-habit, per-day check-in counts within the given date range.")
    @ApiResponse(responseCode = "400", description = "Invalid date range", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/history")
    public List<HabitHistoryEntry> history(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return habitService.history(from, to).stream()
                .map(row -> new HabitHistoryEntry(row.getHabitId(), row.getCheckInDate(), row.getCheckInCount().intValue()))
                .toList();
    }

    @Operation(summary = "Create a habit")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Habit created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<HabitResponse> create(@Validated @RequestBody CreateHabitRequest request) {
        Habit saved = habitService.save(mapper.fromCreateRequest(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(saved));
    }

    @Operation(summary = "Update a habit")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Habit updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public HabitResponse update(@PathVariable Long id, @Validated @RequestBody UpdateHabitRequest request) {
        Habit existing = habitService.findById(id);
        mapper.applyUpdateRequest(existing, request);
        return mapper.toResponse(habitService.updateHabit(id, existing));
    }

    @Operation(summary = "Delete a habit")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Habit deleted"),
            @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        habitService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Check in a habit for today")
    @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @PatchMapping("/{id}/check-in")
    public HabitResponse checkIn(@PathVariable Long id) {
        return mapper.toResponse(habitService.checkIn(id));
    }

    @Operation(summary = "Undo today's check-in for a habit")
    @ApiResponse(responseCode = "404", description = "Habit not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @DeleteMapping("/{id}/check-in")
    public HabitResponse undoCheckIn(@PathVariable Long id) {
        return mapper.toResponse(habitService.undoCheckIn(id));
    }
}
