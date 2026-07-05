package com.taskpriority.notes;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.NoteCollection;
import com.taskpriority.notes.api.CreateNoteCollectionRequest;
import com.taskpriority.notes.api.NoteCollectionResponse;
import com.taskpriority.notes.api.UpdateNoteCollectionRequest;
import com.taskpriority.repository.NoteCollectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NoteCollectionService {
    private final NoteCollectionRepository repository;

    public NoteCollectionService(NoteCollectionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<NoteCollectionResponse> findAll() {
        return repository.findAllByOrderByNameAscIdAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteCollectionResponse create(CreateNoteCollectionRequest request) {
        NoteCollection collection = new NoteCollection();
        apply(collection, request.name(), request.description(), request.color(), request.icon());
        return toResponse(repository.save(collection));
    }

    @Transactional
    public NoteCollectionResponse update(Long id, UpdateNoteCollectionRequest request) {
        NoteCollection collection = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note collection with id " + id + " not found"));
        apply(collection, request.name(), request.description(), request.color(), request.icon());
        return toResponse(repository.save(collection));
    }

    @Transactional
    public void delete(Long id) {
        NoteCollection collection = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note collection with id " + id + " not found"));
        repository.delete(collection);
    }

    private void apply(NoteCollection collection, String name, String description, String color, String icon) {
        collection.setName(name.trim());
        collection.setDescription(trimToNull(description));
        collection.setColor(trimToNull(color));
        collection.setIcon(trimToNull(icon));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private NoteCollectionResponse toResponse(NoteCollection collection) {
        return new NoteCollectionResponse(collection.getId(), collection.getName(), collection.getDescription(), collection.getColor(), collection.getIcon(), collection.getCreatedAt(), collection.getUpdatedAt());
    }
}
