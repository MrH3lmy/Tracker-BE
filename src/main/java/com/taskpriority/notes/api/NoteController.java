package com.taskpriority.notes.api;

import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.notes.NoteService;
import com.taskpriority.notes.NoteTaskConversionService;
import com.taskpriority.notes.ai.NoteAiGenerationService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
@Tag(name = "Notes", description = "Sticky notes: CRUD, filtering, version history, layout, task links, screenshot attachments, and AI-assisted actions")
public class NoteController {
    private final NoteService noteService;
    private final NoteTaskConversionService noteTaskConversionService;
    private final NoteAiGenerationService noteAiGenerationService;

    public NoteController(NoteService noteService, NoteTaskConversionService noteTaskConversionService, NoteAiGenerationService noteAiGenerationService) {
        this.noteService = noteService;
        this.noteTaskConversionService = noteTaskConversionService;
        this.noteAiGenerationService = noteAiGenerationService;
    }

    @Operation(summary = "List/search notes", description = "Supports filtering by task, collection, free-text query, content type, tags, attachment/link presence, created/updated date ranges, tag mode, sorting, and pagination.")
    @GetMapping
    public List<NoteResponse> all(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Long collectionId,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) NoteContentType contentType,
            @RequestParam(required = false, name = "tag") List<String> tags,
            @RequestParam(required = false) Boolean hasAttachments,
            @RequestParam(required = false) Boolean linkedTask,
            @RequestParam(required = false) String createdFrom,
            @RequestParam(required = false) String createdTo,
            @RequestParam(required = false) String updatedFrom,
            @RequestParam(required = false) String updatedTo,
            @RequestParam(required = false) Boolean untagged,
            @RequestParam(required = false) String tagMode,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return noteService.findAll(taskId, collectionId, query, contentType, tags, hasAttachments, linkedTask, createdFrom, createdTo, updatedFrom, updatedTo, untagged, tagMode, sortBy, sortDirection, page, size);
    }

    @Operation(summary = "Get a note by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Note found"),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public NoteResponse byId(@PathVariable Long id) {
        return noteService.findById(id);
    }

    @Operation(summary = "Create a note")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Note created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<NoteResponse> create(@Validated @RequestBody CreateNoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.create(request));
    }

    @Operation(summary = "Update a note", description = "Creates a new version snapshot before applying the update.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Note updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public NoteResponse update(@PathVariable Long id, @Validated @RequestBody UpdateNoteRequest request) {
        return noteService.update(id, request);
    }

    @Operation(summary = "List a note's version history")
    @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/versions")
    public List<NoteVersionResponse> versions(@PathVariable Long id) {
        return noteService.findVersions(id);
    }

    @Operation(summary = "Get a specific version of a note")
    @ApiResponse(responseCode = "404", description = "Note or version not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/versions/{versionId}")
    public NoteVersionResponse version(@PathVariable Long id, @PathVariable Long versionId) {
        return noteService.findVersion(id, versionId);
    }

    @Operation(summary = "Restore a note to a previous version")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Note restored"),
            @ApiResponse(responseCode = "404", description = "Note or version not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/versions/{versionId}/restore")
    public NoteResponse restoreVersion(@PathVariable Long id, @PathVariable Long versionId) {
        return noteService.restoreVersion(id, versionId);
    }

    @Operation(summary = "Update a note's canvas layout", description = "Updates position/size/z-index for the note's freeform canvas placement.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Layout updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PatchMapping("/{id}/layout")
    public NoteResponse updateLayout(@PathVariable Long id, @Validated @RequestBody UpdateNoteLayoutRequest request) {
        return noteService.updateLayout(id, request);
    }

    @Operation(summary = "List a note's task links")
    @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/task-links")
    public List<NoteTaskLinkResponse> taskLinks(@PathVariable Long id) {
        return noteService.findLinksForNote(id);
    }

    @Operation(summary = "Link a note to a task", description = "Optionally scopes the link to a specific block within the note.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Task link created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Note or task not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/task-links")
    public ResponseEntity<NoteTaskLinkResponse> createTaskLink(@PathVariable Long id, @Validated @RequestBody CreateNoteTaskLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.createTaskLink(id, request));
    }

    @Operation(summary = "Remove a task link from a note")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Task link removed"),
            @ApiResponse(responseCode = "404", description = "Note or task link not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}/task-links/{linkId}")
    public ResponseEntity<Void> deleteTaskLink(@PathVariable Long id, @PathVariable Long linkId) {
        noteService.deleteTaskLink(id, linkId);
        return ResponseEntity.noContent().build();
    }


    @Operation(summary = "Convert a note selection into a new task", description = "Creates a task from a highlighted portion of a note's content and links it back to the note.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Task created from the note selection"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/convert-selection-to-task")
    public ResponseEntity<ConvertNoteToTaskResponse> convertSelectionToTask(@PathVariable Long id, @Validated @RequestBody ConvertNoteToTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTaskConversionService.convertSelection(id, request));
    }

    @Operation(
            summary = "Attach a client-captured screenshot to a note",
            description = "Screenshot tool contract: clients or integrations capture an image in their own UI, then POST multipart/form-data with required field `file` and optional fields `caption`, `source`, `width`, and `height`. The backend validates and stores the image as a note attachment and returns metadata plus a stable download URL.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Screenshot attached", content = @Content(schema = @Schema(implementation = NoteAttachmentResponse.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid screenshot upload"),
                    @ApiResponse(responseCode = "404", description = "Note not found")
            }
    )
    @PostMapping(value = "/{id}/tools/screenshot", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<NoteAttachmentResponse> createScreenshot(
            @Parameter(description = "Note id that will receive the screenshot attachment") @PathVariable Long id,
            @ModelAttribute CreateScreenshotRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.uploadScreenshot(id, request));
    }

    @Operation(summary = "Attach a screenshot to a note (deprecated)", description = "Deprecated alias for POST /{id}/tools/screenshot.", deprecated = true)
    @Deprecated
    @PostMapping(value = "/{id}/screenshots", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<NoteAttachmentResponse> uploadScreenshot(@PathVariable Long id, @ModelAttribute CreateScreenshotRequest request) {
        return createScreenshot(id, request);
    }

    @Operation(summary = "Download a note screenshot", description = "Streams the raw image bytes with the attachment's content type.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Screenshot bytes", content = @Content(mediaType = "image/*", schema = @Schema(type = "string", format = "binary"))),
            @ApiResponse(responseCode = "404", description = "Note or attachment not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @GetMapping("/{id}/screenshots/{attachmentId}")
    public ResponseEntity<byte[]> getScreenshot(@PathVariable Long id, @PathVariable Long attachmentId) {
        NoteAttachment attachment = noteService.getScreenshot(id, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"")
                .body(attachment.getData());
    }

    @Operation(summary = "Delete a note screenshot")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Screenshot deleted"),
            @ApiResponse(responseCode = "404", description = "Note or attachment not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}/screenshots/{attachmentId}")
    public ResponseEntity<Void> deleteScreenshot(@PathVariable Long id, @PathVariable Long attachmentId) {
        noteService.deleteScreenshot(id, attachmentId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List a note's AI generation history", description = "Audit log of AI-assisted actions run against the note.")
    @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @GetMapping("/{id}/ai-generations")
    public List<NoteAiGenerationResponse> aiGenerations(@PathVariable Long id) {
        return noteAiGenerationService.findByNote(id);
    }

    @Operation(summary = "Run a heuristic AI action on a note", description = "E.g. summarize, extract action items, or rewrite content; records the result in the note's AI generation audit log.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "AI action run and recorded"),
            @ApiResponse(responseCode = "400", description = "Validation error or unsupported action", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PostMapping("/{id}/ai-actions")
    public ResponseEntity<NoteAiGenerationResponse> runAiAction(@PathVariable Long id, @Validated @RequestBody RunNoteAiActionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteAiGenerationService.run(id, request));
    }

    @Operation(summary = "Delete a note")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Note deleted"),
            @ApiResponse(responseCode = "404", description = "Note not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        noteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
