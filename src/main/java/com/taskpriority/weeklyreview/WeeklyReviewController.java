package com.taskpriority.weeklyreview;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.WeeklyReview;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/weekly-reviews")
@Tag(name = "Weekly Reviews", description = "Completed weekly review records and the current in-progress draft")
public class WeeklyReviewController {
    private final WeeklyReviewService weeklyReviewService;
    private final WeeklyReviewApiMapper mapper;

    public WeeklyReviewController(WeeklyReviewService weeklyReviewService, WeeklyReviewApiMapper mapper) {
        this.weeklyReviewService = weeklyReviewService;
        this.mapper = mapper;
    }

    @Operation(summary = "List past weekly reviews", description = "Returns the most recent reviews, newest first, up to the given limit.")
    @GetMapping
    public List<WeeklyReviewResponse> all(@RequestParam(defaultValue = "20") int limit) {
        return weeklyReviewService.findAll(limit).stream().map(mapper::toResponse).toList();
    }

    @Operation(summary = "Get the current in-progress review draft", description = "Computed summary of the current week, before it is completed and persisted.")
    @GetMapping("/current-draft")
    public WeeklyReviewDraftResponse currentDraft() {
        return weeklyReviewService.getCurrentDraft();
    }

    @Operation(summary = "Get a weekly review by id")
    @ApiResponse(responseCode = "404", description = "Weekly review not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}")
    public WeeklyReviewResponse byId(@PathVariable Long id) {
        return mapper.toResponse(weeklyReviewService.findById(id));
    }

    @Operation(summary = "Complete the current weekly review", description = "Persists the current draft as a completed weekly review record.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Weekly review completed"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<WeeklyReviewResponse> complete(@Validated @RequestBody CompleteWeeklyReviewRequest request) {
        WeeklyReview created = weeklyReviewService.completeReview(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }
}
