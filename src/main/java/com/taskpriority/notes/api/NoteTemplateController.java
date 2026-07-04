package com.taskpriority.notes.api;

import com.taskpriority.notes.NoteTemplateService;
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
public class NoteTemplateController {
    private final NoteTemplateService noteTemplateService;

    public NoteTemplateController(NoteTemplateService noteTemplateService) {
        this.noteTemplateService = noteTemplateService;
    }

    @GetMapping("/api/v1/note-templates")
    public List<NoteTemplateResponse> all() {
        return noteTemplateService.findAll();
    }

    @PostMapping("/api/v1/notes/from-template")
    public ResponseEntity<NoteResponse> createFromTemplate(@Validated @RequestBody CreateNoteFromTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTemplateService.createNoteFromTemplate(request));
    }
}
