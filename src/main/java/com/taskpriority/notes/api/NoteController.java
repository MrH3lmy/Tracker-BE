package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;
import com.taskpriority.notes.NoteService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {
    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<NoteResponse> all(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) NoteContentType contentType,
            @RequestParam(required = false, name = "tag") List<String> tags
    ) {
        return noteService.findAll(taskId, query, contentType, tags);
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        noteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
