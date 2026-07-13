package com.taskpriority.notes.api;

import com.taskpriority.notes.NoteSavedViewService;
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
public class NoteSavedViewController {
    private final NoteSavedViewService service;

    public NoteSavedViewController(NoteSavedViewService service) { this.service = service; }

    @GetMapping
    public List<NoteSavedViewResponse> all() { return service.findAll(); }

    @PostMapping
    public ResponseEntity<NoteSavedViewResponse> create(@Validated @RequestBody NoteSavedViewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public NoteSavedViewResponse update(@PathVariable Long id, @Validated @RequestBody NoteSavedViewRequest request) { return service.update(id, request); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
