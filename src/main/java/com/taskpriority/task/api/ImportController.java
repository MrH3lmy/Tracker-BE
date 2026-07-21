package com.taskpriority.task.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.task.application.ImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/import")
@Tag(name = "Import", description = "Bulk CSV import of tasks")
public class ImportController {
    private final ImportService importService;
    public ImportController(ImportService importService){this.importService=importService;}

    @Operation(summary = "Import tasks from raw CSV", description = "Parses the request body as CSV and returns the number of tasks imported.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Number of tasks imported"),
            @ApiResponse(responseCode = "400", description = "Malformed CSV", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/csv") public int importCsv(@RequestBody String csv){ return importService.importCsv(csv).size(); }

    @Operation(summary = "Import tasks from CSV with a detailed result", description = "Parses the request body as CSV and returns per-row import results, including duplicates/errors skipped.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Import result summary"),
            @ApiResponse(responseCode = "400", description = "Malformed CSV", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/tasks") public ImportService.ImportResult importTasks(@RequestBody String csv){ return importService.importTasksCsv(csv); }
}
