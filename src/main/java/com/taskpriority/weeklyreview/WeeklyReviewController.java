package com.taskpriority.weeklyreview;

import com.taskpriority.model.WeeklyReview;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/weekly-reviews")
public class WeeklyReviewController {
    private final WeeklyReviewService weeklyReviewService;
    private final WeeklyReviewApiMapper mapper;

    public WeeklyReviewController(WeeklyReviewService weeklyReviewService, WeeklyReviewApiMapper mapper) {
        this.weeklyReviewService = weeklyReviewService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<WeeklyReviewResponse> all(@RequestParam(defaultValue = "20") int limit) {
        return weeklyReviewService.findAll(limit).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/current-draft")
    public WeeklyReviewDraftResponse currentDraft() {
        return weeklyReviewService.getCurrentDraft();
    }

    @GetMapping("/{id}")
    public WeeklyReviewResponse byId(@PathVariable Long id) {
        return mapper.toResponse(weeklyReviewService.findById(id));
    }

    @PostMapping
    public ResponseEntity<WeeklyReviewResponse> complete(@Validated @RequestBody CompleteWeeklyReviewRequest request) {
        WeeklyReview created = weeklyReviewService.completeReview(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }
}
