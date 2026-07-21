package com.taskpriority.search;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "Cross-entity full-text and filtered search")
public class SearchController {
    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @Operation(summary = "Search across tasks, notes, habits, and projects", description = "Free-text query plus optional filters for type, status, due date, area, and tag; paginated.")
    @GetMapping
    public SearchResponse search(
            @Parameter(description = "Free-text search query") @RequestParam(required = false, defaultValue = "") String q,
            @Parameter(description = "Result type filter, e.g. task/note/habit/project") @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @Parameter(description = "Due-date filter, e.g. overdue/today/upcoming") @RequestParam(required = false) String due,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return searchService.search(q, type, status, due, area, tag, page, size);
    }
}
