package com.taskpriority.notes.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.notes.NoteSavedViewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/note-saved-views")
@Tag(name = "Note Saved Views", description = "Saved filter/sort presets for the notes list")
public class NoteSavedViewController {
    private final NoteSavedViewService service;

    public NoteSavedViewController(NoteSavedViewService service) { this.service = service; }

    @Operation(summary = "List all saved views")
    @GetMapping
    public List<NoteSavedViewResponse> all() { return service.findAll(); }

    @Operation(summary = "Create a saved view")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Saved view created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<NoteSavedViewResponse> create(@Validated @RequestBody NoteSavedViewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @Operation(summary = "Update a saved view")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Saved view updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Saved view not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public NoteSavedViewResponse update(@PathVariable Long id, @Validated @RequestBody NoteSavedViewRequest request) { return service.update(id, request); }

    @Operation(summary = "Delete a saved view")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Saved view deleted"),
            @ApiResponse(responseCode = "404", description = "Saved view not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
