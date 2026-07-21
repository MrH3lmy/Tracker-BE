package com.taskpriority.notes.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.notes.NoteCollectionService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/note-collections")
@Tag(name = "Note Collections", description = "Folders/groupings for organizing notes")
public class NoteCollectionController {
    private final NoteCollectionService service;

    public NoteCollectionController(NoteCollectionService service) {
        this.service = service;
    }

    @Operation(summary = "List all note collections")
    @GetMapping
    public List<NoteCollectionResponse> all() {
        return service.findAll();
    }

    @Operation(summary = "Create a note collection")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Collection created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<NoteCollectionResponse> create(@Validated @RequestBody CreateNoteCollectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @Operation(summary = "Update a note collection")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Collection updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Collection not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}")
    public NoteCollectionResponse update(@PathVariable Long id, @Validated @RequestBody UpdateNoteCollectionRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete a note collection")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Collection deleted"),
            @ApiResponse(responseCode = "404", description = "Collection not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
