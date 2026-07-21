package com.taskpriority.notes.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.notes.NoteTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Tag(name = "Note Templates", description = "Reusable note templates and creating notes from them")
public class NoteTemplateController {
    private final NoteTemplateService noteTemplateService;

    public NoteTemplateController(NoteTemplateService noteTemplateService) {
        this.noteTemplateService = noteTemplateService;
    }

    @Operation(summary = "List all note templates")
    @GetMapping("/api/v1/note-templates")
    public List<NoteTemplateResponse> all() {
        return noteTemplateService.findAll();
    }

    @Operation(summary = "Create a note from a template")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Note created from template"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Template not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/api/v1/notes/from-template")
    public ResponseEntity<NoteResponse> createFromTemplate(@Validated @RequestBody CreateNoteFromTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTemplateService.createNoteFromTemplate(request));
    }
}
