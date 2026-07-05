package com.taskpriority.notes.api;

import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.notes.NoteService;
import com.taskpriority.notes.NoteBlockService;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {
    private final NoteService noteService;
    private final NoteBlockService noteBlockService;
    private final NoteTaskConversionService noteTaskConversionService;
    private final NoteAiGenerationService noteAiGenerationService;

    public NoteController(NoteService noteService, NoteBlockService noteBlockService, NoteTaskConversionService noteTaskConversionService, NoteAiGenerationService noteAiGenerationService) {
        this.noteService = noteService;
        this.noteBlockService = noteBlockService;
        this.noteTaskConversionService = noteTaskConversionService;
        this.noteAiGenerationService = noteAiGenerationService;
    }

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

    @GetMapping("/{id}")
    public NoteResponse byId(@PathVariable Long id) {
        return noteService.findById(id);
    }

    @PostMapping
    public ResponseEntity<NoteResponse> create(@Validated @RequestBody CreateNoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.create(request));
    }

    @PutMapping("/{id}")
    public NoteResponse update(@PathVariable Long id, @Validated @RequestBody UpdateNoteRequest request) {
        return noteService.update(id, request);
    }

    @GetMapping("/{id}/versions")
    public List<NoteVersionResponse> versions(@PathVariable Long id) {
        return noteService.findVersions(id);
    }

    @GetMapping("/{id}/versions/{versionId}")
    public NoteVersionResponse version(@PathVariable Long id, @PathVariable Long versionId) {
        return noteService.findVersion(id, versionId);
    }

    @PostMapping("/{id}/versions/{versionId}/restore")
    public NoteResponse restoreVersion(@PathVariable Long id, @PathVariable Long versionId) {
        return noteService.restoreVersion(id, versionId);
    }

    @PatchMapping("/{id}/layout")
    public NoteResponse updateLayout(@PathVariable Long id, @Validated @RequestBody UpdateNoteLayoutRequest request) {
        return noteService.updateLayout(id, request);
    }

    @GetMapping("/{id}/task-links")
    public List<NoteTaskLinkResponse> taskLinks(@PathVariable Long id) {
        return noteService.findLinksForNote(id);
    }

    @PostMapping("/{id}/task-links")
    public ResponseEntity<NoteTaskLinkResponse> createTaskLink(@PathVariable Long id, @Validated @RequestBody CreateNoteTaskLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.createTaskLink(id, request));
    }

    @DeleteMapping("/{id}/task-links/{linkId}")
    public ResponseEntity<Void> deleteTaskLink(@PathVariable Long id, @PathVariable Long linkId) {
        noteService.deleteTaskLink(id, linkId);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/{id}/blocks")
    public List<NoteBlockResponse> blocks(@PathVariable Long id) {
        return noteBlockService.findByNoteId(id);
    }

    @PostMapping("/{id}/blocks")
    public ResponseEntity<NoteBlockResponse> createBlock(@PathVariable Long id, @Validated @RequestBody CreateNoteBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteBlockService.create(id, request));
    }

    @PatchMapping("/{id}/blocks/{blockId}")
    public NoteBlockResponse updateBlock(@PathVariable Long id, @PathVariable Long blockId, @RequestBody UpdateNoteBlockRequest request) {
        return noteBlockService.update(id, blockId, request);
    }

    @DeleteMapping("/{id}/blocks/{blockId}")
    public ResponseEntity<Void> deleteBlock(@PathVariable Long id, @PathVariable Long blockId) {
        noteBlockService.delete(id, blockId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/blocks/{blockId}/convert-to-task")
    public ResponseEntity<ConvertNoteToTaskResponse> convertBlockToTask(@PathVariable Long id, @PathVariable Long blockId, @Validated @RequestBody ConvertNoteToTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTaskConversionService.convertBlock(id, blockId, request));
    }

    @PostMapping("/{id}/convert-selection-to-task")
    public ResponseEntity<ConvertNoteToTaskResponse> convertSelectionToTask(@PathVariable Long id, @Validated @RequestBody ConvertNoteToTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTaskConversionService.convertSelection(id, request));
    }

    @PatchMapping("/{id}/blocks/reorder")
    public List<NoteBlockResponse> reorderBlocks(@PathVariable Long id, @Validated @RequestBody ReorderNoteBlocksRequest request) {
        return noteBlockService.reorder(id, request);
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

    @Deprecated
    @PostMapping(value = "/{id}/screenshots", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<NoteAttachmentResponse> uploadScreenshot(@PathVariable Long id, @ModelAttribute CreateScreenshotRequest request) {
        return createScreenshot(id, request);
    }

    @GetMapping("/{id}/screenshots/{attachmentId}")
    public ResponseEntity<byte[]> getScreenshot(@PathVariable Long id, @PathVariable Long attachmentId) {
        NoteAttachment attachment = noteService.getScreenshot(id, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"")
                .body(attachment.getData());
    }

    @DeleteMapping("/{id}/screenshots/{attachmentId}")
    public ResponseEntity<Void> deleteScreenshot(@PathVariable Long id, @PathVariable Long attachmentId) {
        noteService.deleteScreenshot(id, attachmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/ai-generations")
    public List<NoteAiGenerationResponse> aiGenerations(@PathVariable Long id) {
        return noteAiGenerationService.findByNote(id);
    }

    @PostMapping("/{id}/ai-actions")
    public ResponseEntity<NoteAiGenerationResponse> runAiAction(@PathVariable Long id, @Validated @RequestBody RunNoteAiActionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteAiGenerationService.run(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        noteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
