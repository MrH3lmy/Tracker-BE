package com.taskpriority.notes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.Task;
import com.taskpriority.model.Tag;
import com.taskpriority.notes.api.CreateNoteRequest;
import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.notes.api.UpdateNoteRequest;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class NoteService {
    private final NoteRepository noteRepository;
    private final TaskRepository taskRepository;
    private final TagRepository tagRepository;
    private final ObjectMapper objectMapper;

    public NoteService(NoteRepository noteRepository, TaskRepository taskRepository, TagRepository tagRepository, ObjectMapper objectMapper) {
        this.noteRepository = noteRepository;
        this.taskRepository = taskRepository;
        this.tagRepository = tagRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> findAll(Long taskId, String query, NoteContentType contentType, List<String> tags) {
        if (taskId != null && !taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        String normalizedQuery = normalizeQuery(query);
        List<String> normalizedTags = normalizeTags(tags);
        return noteRepository.findAllMatching(taskId, normalizedQuery, contentType, !normalizedTags.isEmpty(), normalizedTags)
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
        note.setDisplayOrder(defaultZero(request.displayOrder()));
        note.setPositionX(request.positionX());
        note.setPositionY(request.positionY());
        note.setWidth(request.width());
        note.setHeight(request.height());
        note.setColor(normalizeColor(request.color()));
        note.setZIndex(defaultZero(request.zIndex()));
        note.setTags(resolveTags(request.tags()));
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
        note.setDisplayOrder(defaultZero(request.displayOrder()));
        note.setPositionX(request.positionX());
        note.setPositionY(request.positionY());
        note.setWidth(request.width());
        note.setHeight(request.height());
        note.setColor(normalizeColor(request.color()));
        note.setZIndex(defaultZero(request.zIndex()));
        note.setTags(resolveTags(request.tags()));
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


    private Set<Tag> resolveTags(List<String> rawTags) {
        List<String> tagNames = normalizeTags(rawTags);
        if (tagNames.isEmpty()) {
            return new LinkedHashSet<>();
        }

        Map<String, Tag> existingTags = tagRepository.findByNameIn(tagNames)
                .stream()
                .collect(Collectors.toMap(Tag::getName, Function.identity()));
        List<Tag> tagsToCreate = tagNames.stream()
                .filter(tagName -> !existingTags.containsKey(tagName))
                .map(Tag::new)
                .toList();
        if (!tagsToCreate.isEmpty()) {
            tagRepository.saveAll(tagsToCreate)
                    .forEach(tag -> existingTags.put(tag.getName(), tag));
        }

        return tagNames.stream()
                .map(existingTags::get)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<String> normalizeTags(List<String> rawTags) {
        if (rawTags == null) {
            return List.of();
        }

        return rawTags.stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .flatMap(tag -> Arrays.stream(tag.split(",")))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .map(tag -> tag.toLowerCase(Locale.ROOT))
                .distinct()
                .limit(20)
                .toList();
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private Integer defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String normalizeColor(String color) {
        if (color == null || color.isBlank()) {
            return null;
        }
        return color.trim();
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
        List<String> tags = note.getTags().stream()
                .map(Tag::getName)
                .sorted(Comparator.naturalOrder())
                .toList();
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getBody(),
                note.getContentType(),
                taskId,
                note.getDisplayOrder(),
                note.getPositionX(),
                note.getPositionY(),
                note.getWidth(),
                note.getHeight(),
                note.getColor(),
                note.getZIndex(),
                tags,
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
