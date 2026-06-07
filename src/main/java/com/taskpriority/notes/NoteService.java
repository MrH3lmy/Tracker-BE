package com.taskpriority.notes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.Task;
import com.taskpriority.notes.api.CreateNoteRequest;
import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.notes.api.UpdateNoteRequest;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NoteService {
    private final NoteRepository noteRepository;
    private final TaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    public NoteService(NoteRepository noteRepository, TaskRepository taskRepository, ObjectMapper objectMapper) {
        this.noteRepository = noteRepository;
        this.taskRepository = taskRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> findAll(Long taskId, String query, NoteContentType contentType) {
        if (taskId != null && !taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        String normalizedQuery = normalizeQuery(query);
        return noteRepository.findAllMatching(taskId, normalizedQuery, contentType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> findByTaskId(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        return noteRepository.findByTaskIdOrderByUpdatedAtDescIdDesc(taskId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse findById(Long id) {
        return toResponse(getNote(id));
    }

    @Transactional
    public NoteResponse create(CreateNoteRequest request) {
        NoteContentType contentType = request.contentType() == null ? NoteContentType.PLAIN_TEXT : request.contentType();

        Note note = new Note();
        note.setTitle(request.title().trim());
        note.setBody(formatBody(request.body(), contentType));
        note.setContentType(contentType);
        note.setTask(resolveTask(request.taskId()));
        return toResponse(noteRepository.save(note));
    }

    @Transactional
    public NoteResponse update(Long id, UpdateNoteRequest request) {
        NoteContentType contentType = request.contentType() == null ? NoteContentType.PLAIN_TEXT : request.contentType();

        Note note = getNote(id);
        note.setTitle(request.title().trim());
        note.setBody(formatBody(request.body(), contentType));
        note.setContentType(contentType);
        note.setTask(resolveTask(request.taskId()));
        return toResponse(noteRepository.save(note));
    }

    @Transactional
    public void delete(Long id) {
        Note note = getNote(id);
        noteRepository.delete(note);
    }

    private Note getNote(Long id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note with id " + id + " not found"));
    }

    private Task resolveTask(Long taskId) {
        if (taskId == null) {
            return null;
        }
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + taskId + " not found"));
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private String formatBody(String body, NoteContentType contentType) {
        if (body == null) {
            return null;
        }

        String trimmedBody = body.trim();
        if (trimmedBody.isBlank() || contentType == null) {
            return trimmedBody;
        }

        if (contentType == NoteContentType.JSON) {
            return formatJson(trimmedBody);
        }

        return trimmedBody;
    }

    private String formatJson(String body) {
        try {
            Object json = objectMapper.readValue(body, Object.class);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(json);
        } catch (JsonProcessingException ex) {
            return body;
        }
    }

    private NoteResponse toResponse(Note note) {
        Long taskId = note.getTask() == null ? null : note.getTask().getId();
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getBody(),
                note.getContentType(),
                taskId,
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
