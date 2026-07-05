package com.taskpriority.notes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteAttachmentKind;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.NoteCollection;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.NoteTaskLink;
import com.taskpriority.model.NoteVersion;
import com.taskpriority.model.Task;
import com.taskpriority.model.Tag;
import com.taskpriority.notes.api.CreateNoteRequest;
import com.taskpriority.notes.api.CreateNoteTaskLinkRequest;
import com.taskpriority.notes.api.NoteTaskLinkResponse;
import com.taskpriority.notes.api.NoteVersionResponse;
import com.taskpriority.notes.api.CreateScreenshotRequest;
import com.taskpriority.notes.api.NoteAttachmentResponse;
import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.notes.api.UpdateNoteRequest;
import com.taskpriority.notes.api.UpdateNoteLayoutRequest;
import com.taskpriority.task.api.TaskScreenshotResponse;
import com.taskpriority.repository.NoteAttachmentRepository;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteCollectionRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.repository.NoteVersionRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TagRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class NoteService {
    private final NoteRepository noteRepository;
    private final NoteCollectionRepository noteCollectionRepository;
    private static final Set<String> ALLOWED_SCREENSHOT_CONTENT_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final int MAX_ATTACHMENT_FILE_NAME_LENGTH = 255;
    private static final int MAX_ATTACHMENT_CAPTION_LENGTH = 500;
    private static final int MAX_ATTACHMENT_SOURCE_LENGTH = 100;

    private final TaskRepository taskRepository;
    private final TagRepository tagRepository;
    private final NoteAttachmentRepository noteAttachmentRepository;
    private final NoteBlockRepository noteBlockRepository;
    private final NoteTaskLinkRepository noteTaskLinkRepository;
    private final NoteVersionRepository noteVersionRepository;
    private final NoteTaskLinkMapper noteTaskLinkMapper;
    private final ObjectMapper objectMapper;
    private final long maxScreenshotSizeBytes;
    private static final Duration VERSION_DEBOUNCE = Duration.ofMinutes(2);
    private static final int MAJOR_EDIT_BODY_DELTA = 120;

    public NoteService(NoteRepository noteRepository, NoteCollectionRepository noteCollectionRepository, TaskRepository taskRepository, TagRepository tagRepository,
                       NoteAttachmentRepository noteAttachmentRepository, NoteBlockRepository noteBlockRepository, NoteTaskLinkRepository noteTaskLinkRepository, NoteVersionRepository noteVersionRepository, NoteTaskLinkMapper noteTaskLinkMapper, ObjectMapper objectMapper,
                       @Value("${app.notes.screenshots.max-file-size-bytes:5242880}") long maxScreenshotSizeBytes) {
        this.noteRepository = noteRepository;
        this.noteCollectionRepository = noteCollectionRepository;
        this.taskRepository = taskRepository;
        this.tagRepository = tagRepository;
        this.noteAttachmentRepository = noteAttachmentRepository;
        this.noteBlockRepository = noteBlockRepository;
        this.noteTaskLinkRepository = noteTaskLinkRepository;
        this.noteVersionRepository = noteVersionRepository;
        this.noteTaskLinkMapper = noteTaskLinkMapper;
        this.objectMapper = objectMapper;
        this.maxScreenshotSizeBytes = maxScreenshotSizeBytes;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> findAll(Long taskId, Long collectionId, String query, NoteContentType contentType, List<String> tags,
                                      Boolean hasAttachments, Boolean linkedTask, String createdFrom, String createdTo,
                                      String updatedFrom, String updatedTo, Boolean untagged, String tagMode,
                                      String sortBy, String sortDirection, Integer page, Integer size) {
        if (taskId != null && !taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        if (collectionId != null && !noteCollectionRepository.existsById(collectionId)) {
            throw new ResourceNotFoundException("Note collection with id " + collectionId + " not found");
        }
        String normalizedQuery = normalizeQuery(query);
        List<String> normalizedTags = normalizeTags(tags);
        Pageable pageable = buildNotesPageable(sortBy, sortDirection, page, size, taskId != null);
        boolean matchAllTags = "all".equalsIgnoreCase(tagMode);
        long requiredTagCount = matchAllTags ? normalizedTags.size() : 0L;
        return noteRepository.findAllMatching(taskId, collectionId, normalizedQuery, contentType, hasAttachments, linkedTask,
                        parseStartDateTime(createdFrom), parseEndDateTime(createdTo), parseStartDateTime(updatedFrom),
                        parseEndDateTime(updatedTo), untagged, !normalizedTags.isEmpty(), normalizedTags, requiredTagCount, pageable)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> findByTaskId(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        return noteRepository.findByTaskIdOrderByDisplayOrderAscIdAsc(taskId)
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<TaskScreenshotResponse> findTaskScreenshots(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        return noteAttachmentRepository.findTaskAttachmentsByKindInNavigationOrder(taskId, NoteAttachmentKind.SCREENSHOT)
                .stream()
                .map(this::toTaskScreenshotResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteTaskLinkResponse> findLinkedNotesForTask(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task with id " + taskId + " not found");
        }
        return noteTaskLinkRepository.findByTaskId(taskId).stream().map(noteTaskLinkMapper::toResponse).toList();
    }


    @Transactional(readOnly = true)
    public List<NoteTaskLinkResponse> findLinksForNote(Long noteId) {
        if (!noteRepository.existsById(noteId)) {
            throw new ResourceNotFoundException("Note with id " + noteId + " not found");
        }
        return noteTaskLinkRepository.findByNoteId(noteId).stream().map(noteTaskLinkMapper::toResponse).toList();
    }

    @Transactional
    public NoteTaskLinkResponse createTaskLink(Long noteId, CreateNoteTaskLinkRequest request) {
        Note note = getNote(noteId);
        Task task = resolveTask(request.taskId());
        NoteBlock block = null;
        if (request.blockId() != null) {
            block = noteBlockRepository.findByIdAndNoteId(request.blockId(), noteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Block with id " + request.blockId() + " not found for note " + noteId));
        }
        boolean exists = block == null
                ? noteTaskLinkRepository.existsByNoteIdAndTaskIdAndNoteBlockIsNull(noteId, task.getId())
                : noteTaskLinkRepository.existsByNoteIdAndTaskIdAndNoteBlockId(noteId, task.getId(), block.getId());
        if (exists) {
            Long blockId = block == null ? null : block.getId();
            return findLinksForNote(noteId).stream()
                    .filter(link -> link.taskId().equals(task.getId()) && (blockId == null ? link.blockId() == null : blockId.equals(link.blockId())))
                    .findFirst()
                    .orElseThrow();
        }
        NoteTaskLink link = new NoteTaskLink();
        link.setNote(note);
        link.setNoteBlock(block);
        link.setTask(task);
        link.setSelectedText(trimToNull(request.selectedText()));
        link.setLinkType(normalizeLinkType(request.linkType()));
        return noteTaskLinkMapper.toResponse(noteTaskLinkRepository.save(link));
    }

    @Transactional
    public void deleteTaskLink(Long noteId, Long linkId) {
        NoteTaskLink link = noteTaskLinkRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("Task link with id " + linkId + " not found"));
        if (!link.getNote().getId().equals(noteId)) {
            throw new ResourceNotFoundException("Task link with id " + linkId + " not found for note " + noteId);
        }
        noteTaskLinkRepository.delete(link);
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
        note.setCollection(resolveCollection(request.collectionId()));
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
        createVersionBeforeEdit(note, request.title(), request.body(), request.contentType(), request.tags(), "note-update");
        note.setTitle(request.title().trim());
        note.setBody(formatBody(request.body(), contentType));
        note.setContentType(contentType);
        note.setTask(resolveTask(request.taskId()));
        note.setCollection(resolveCollection(request.collectionId()));
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


    @Transactional(readOnly = true)
    public List<NoteVersionResponse> findVersions(Long noteId) {
        if (!noteRepository.existsById(noteId)) {
            throw new ResourceNotFoundException("Note with id " + noteId + " not found");
        }
        return noteVersionRepository.findByNoteIdOrderByCreatedAtDescIdDesc(noteId).stream().map(this::toVersionResponse).toList();
    }

    @Transactional(readOnly = true)
    public NoteVersionResponse findVersion(Long noteId, Long versionId) {
        return toVersionResponse(getVersion(noteId, versionId));
    }

    @Transactional
    public NoteResponse restoreVersion(Long noteId, Long versionId) {
        Note note = getNote(noteId);
        NoteVersion version = getVersion(noteId, versionId);
        createSnapshot(note, "pre-restore");
        note.setTitle(version.getTitle());
        note.setBody(version.getBody());
        note.setContentType(version.getContentType());
        note.setTags(resolveTags(parseTags(version.getTags())));
        restoreBlocks(note, version.getBlocksJson());
        return toResponse(noteRepository.save(note));
    }

    @Transactional
    public NoteResponse updateLayout(Long id, UpdateNoteLayoutRequest request) {
        Note note = getNote(id);
        note.setDisplayOrder(defaultZero(request.displayOrder()));
        note.setPositionX(request.positionX());
        note.setPositionY(request.positionY());
        note.setWidth(request.width());
        note.setHeight(request.height());
        note.setColor(normalizeColor(request.color()));
        note.setZIndex(defaultZero(request.zIndex()));
        return toResponse(noteRepository.save(note));
    }


    @Transactional
    public NoteAttachmentResponse uploadScreenshot(Long noteId, CreateScreenshotRequest request) {
        Note note = getNote(noteId);
        if (request == null) {
            throw new IllegalArgumentException("Screenshot upload request is required");
        }
        MultipartFile file = request.getFile();
        validateScreenshot(file);
        validateDimensions(request.getWidth(), request.getHeight());

        String fileName = cleanFileName(file.getOriginalFilename());
        String caption = trimToNull(request.getCaption());
        String source = trimToNull(request.getSource());
        validateMaxLength(fileName, MAX_ATTACHMENT_FILE_NAME_LENGTH, "Screenshot file name");
        validateMaxLength(caption, MAX_ATTACHMENT_CAPTION_LENGTH, "Screenshot caption");
        validateMaxLength(source, MAX_ATTACHMENT_SOURCE_LENGTH, "Screenshot source");

        NoteAttachment attachment = new NoteAttachment();
        attachment.setNote(note);
        attachment.setFileName(fileName);
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());
        attachment.setStorageKey(UUID.randomUUID().toString());
        attachment.setKind(NoteAttachmentKind.SCREENSHOT);
        attachment.setCaption(caption);
        attachment.setSource(source);
        attachment.setWidth(request.getWidth());
        attachment.setHeight(request.getHeight());
        try {
            attachment.setData(file.getBytes());
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read screenshot file", ex);
        }
        return toAttachmentResponse(noteAttachmentRepository.save(attachment));
    }

    @Transactional(readOnly = true)
    public NoteAttachment getScreenshot(Long noteId, Long attachmentId) {
        if (!noteRepository.existsById(noteId)) {
            throw new ResourceNotFoundException("Note with id " + noteId + " not found");
        }
        return noteAttachmentRepository.findByIdAndNoteIdAndKind(attachmentId, noteId, NoteAttachmentKind.SCREENSHOT)
                .orElseThrow(() -> new ResourceNotFoundException("Screenshot attachment with id " + attachmentId + " not found for note " + noteId));
    }

    @Transactional
    public void deleteScreenshot(Long noteId, Long attachmentId) {
        NoteAttachment attachment = getScreenshot(noteId, attachmentId);
        noteAttachmentRepository.delete(attachment);
    }

    @Transactional
    public void delete(Long id) {
        Note note = getNote(id);
        noteRepository.delete(note);
    }

    public void createVersionForNoteEdit(Long noteId, String reason) {
        createSnapshot(getNote(noteId), reason);
    }

    private NoteVersion getVersion(Long noteId, Long versionId) {
        return noteVersionRepository.findByIdAndNoteId(versionId, noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Version with id " + versionId + " not found for note " + noteId));
    }

    private void createVersionBeforeEdit(Note note, String nextTitle, String nextBody, NoteContentType nextContentType, List<String> nextTags, String reason) {
        if (shouldCreateVersion(note, nextTitle, nextBody, nextContentType, nextTags)) {
            createSnapshot(note, reason);
        }
    }

    private boolean shouldCreateVersion(Note note, String nextTitle, String nextBody, NoteContentType nextContentType, List<String> nextTags) {
        boolean major = !java.util.Objects.equals(note.getTitle(), nextTitle == null ? null : nextTitle.trim())
                || !java.util.Objects.equals(note.getContentType(), nextContentType == null ? NoteContentType.PLAIN_TEXT : nextContentType)
                || Math.abs((note.getBody() == null ? 0 : note.getBody().length()) - (nextBody == null ? 0 : nextBody.length())) >= MAJOR_EDIT_BODY_DELTA
                || !normalizeTags(nextTags).equals(note.getTags().stream().map(Tag::getName).sorted().toList());
        if (major) return true;
        return noteVersionRepository.findTopByNoteIdOrderByCreatedAtDescIdDesc(note.getId())
                .map(version -> Duration.between(version.getCreatedAt(), LocalDateTime.now()).compareTo(VERSION_DEBOUNCE) >= 0)
                .orElse(true);
    }

    private void createSnapshot(Note note, String reason) {
        NoteVersion version = new NoteVersion();
        version.setNote(note);
        version.setTitle(note.getTitle());
        version.setBody(note.getBody());
        version.setContentType(note.getContentType());
        version.setBlocksJson(blocksJson(note.getId()));
        version.setTags(tagsJson(note));
        version.setEditorMetadata("{\"reason\":\"" + reason + "\"}");
        noteVersionRepository.save(version);
    }

    private String blocksJson(Long noteId) {
        try { return objectMapper.writeValueAsString(noteBlockRepository.findByNoteIdOrderByPositionAscIdAsc(noteId).stream().map(block -> Map.of(
                "type", block.getType(), "content", block.getContent() == null ? "" : block.getContent(), "position", block.getPosition(), "checked", Boolean.TRUE.equals(block.getChecked()), "metadata", block.getMetadata() == null ? "" : block.getMetadata()
        )).toList()); } catch (JsonProcessingException ex) { throw new IllegalStateException("Unable to snapshot note blocks", ex); }
    }

    private String tagsJson(Note note) {
        try { return objectMapper.writeValueAsString(note.getTags().stream().map(Tag::getName).sorted().toList()); } catch (JsonProcessingException ex) { throw new IllegalStateException("Unable to snapshot note tags", ex); }
    }

    private List<String> parseTags(String tagsJson) {
        if (tagsJson == null || tagsJson.isBlank()) return List.of();
        try { return objectMapper.readValue(tagsJson, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}); } catch (JsonProcessingException ex) { return List.of(); }
    }

    private void restoreBlocks(Note note, String blocksJson) {
        noteBlockRepository.deleteAll(noteBlockRepository.findByNoteIdOrderByPositionAscIdAsc(note.getId()));
        if (blocksJson == null || blocksJson.isBlank()) return;
        try {
            List<Map<String, Object>> blocks = objectMapper.readValue(blocksJson, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
            for (Map<String, Object> item : blocks) {
                NoteBlock block = new NoteBlock();
                block.setNote(note);
                block.setType(String.valueOf(item.getOrDefault("type", "paragraph")));
                block.setContent((String) item.get("content"));
                block.setPosition(((Number) item.getOrDefault("position", 0)).intValue());
                block.setChecked(Boolean.TRUE.equals(item.get("checked")));
                block.setMetadata((String) item.get("metadata"));
                noteBlockRepository.save(block);
            }
        } catch (JsonProcessingException ex) { throw new IllegalArgumentException("Version blocks snapshot is invalid", ex); }
    }

    private NoteVersionResponse toVersionResponse(NoteVersion version) {
        return new NoteVersionResponse(version.getId(), version.getNote().getId(), version.getTitle(), version.getBody(), version.getContentType(), version.getBlocksJson(), parseTags(version.getTags()), version.getEditorMetadata(), version.getCreatedBy(), version.getCreatedAt());
    }

    private Note getNote(Long id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note with id " + id + " not found"));
    }

    private NoteCollection resolveCollection(Long collectionId) {
        if (collectionId == null) {
            return null;
        }
        return noteCollectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Note collection with id " + collectionId + " not found"));
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

    private Pageable buildNotesPageable(String sortBy, String sortDirection, Integer page, Integer size, boolean taskScoped) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = switch (sortBy == null ? "" : sortBy.trim()) {
            case "createdAt" -> "createdAt";
            case "displayOrder" -> "displayOrder";
            case "title" -> "title";
            case "task" -> "task.title";
            case "contentType" -> "contentType";
            default -> taskScoped ? "displayOrder" : "updatedAt";
        };
        Sort sort = Sort.by(direction, property).and(Sort.by(direction, "id"));
        if (page == null && size == null) {
            return Pageable.unpaged(sort);
        }
        int safePage = Math.max(page == null ? 0 : page, 0);
        int safeSize = Math.min(Math.max(size == null ? 50 : size, 1), 200);
        return PageRequest.of(safePage, safeSize, sort);
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private LocalDateTime parseStartDateTime(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.length() == 10 ? LocalDate.parse(trimmed).atStartOfDay() : LocalDateTime.parse(trimmed);
    }

    private LocalDateTime parseEndDateTime(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.length() == 10 ? LocalDate.parse(trimmed).atTime(LocalTime.MAX) : LocalDateTime.parse(trimmed);
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

    private void validateScreenshot(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Screenshot file is required");
        }
        if (!ALLOWED_SCREENSHOT_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Screenshot content type must be one of: image/png, image/jpeg, image/webp");
        }
        if (file.getSize() > maxScreenshotSizeBytes) {
            throw new IllegalArgumentException("Screenshot file size must not exceed " + maxScreenshotSizeBytes + " bytes");
        }
    }

    private void validateDimensions(Integer width, Integer height) {
        if (width != null && width <= 0) {
            throw new IllegalArgumentException("Screenshot width must be greater than zero when provided");
        }
        if (height != null && height <= 0) {
            throw new IllegalArgumentException("Screenshot height must be greater than zero when provided");
        }
    }

    private String normalizeLinkType(String value) {
        if (value == null || value.isBlank()) {
            return "MENTION";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void validateMaxLength(String value, int maxLength, String fieldName) {
        if (value != null && value.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " must not exceed " + maxLength + " characters");
        }
    }

    private String cleanFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "screenshot";
        }
        return fileName.replace("\\", "/").substring(fileName.replace("\\", "/").lastIndexOf('/') + 1);
    }

    private NoteAttachmentResponse toAttachmentResponse(NoteAttachment attachment) {
        return new NoteAttachmentResponse(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getKind(),
                attachment.getCaption(),
                attachment.getSource(),
                attachment.getWidth(),
                attachment.getHeight(),
                screenshotDownloadUrl(attachment),
                attachment.getCreatedAt()
        );
    }


    private TaskScreenshotResponse toTaskScreenshotResponse(NoteAttachment attachment) {
        return new TaskScreenshotResponse(
                attachment.getId(),
                attachment.getNote().getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getKind(),
                attachment.getCaption(),
                attachment.getSource(),
                attachment.getWidth(),
                attachment.getHeight(),
                screenshotDownloadUrl(attachment),
                attachment.getCreatedAt()
        );
    }

    private String screenshotDownloadUrl(NoteAttachment attachment) {
        String path = "/api/v1/notes/" + attachment.getNote().getId() + "/screenshots/" + attachment.getId();
        if (RequestContextHolder.getRequestAttributes() == null) {
            return path;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(path)
                .build()
                .toUriString();
    }

    private NoteResponse toResponse(Note note) {
        Long taskId = note.getTask() == null ? null : note.getTask().getId();
        Long collectionId = note.getCollection() == null ? null : note.getCollection().getId();
        String collectionName = note.getCollection() == null ? null : note.getCollection().getName();
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
                collectionId,
                collectionName,
                note.getDisplayOrder(),
                note.getPositionX(),
                note.getPositionY(),
                note.getWidth(),
                note.getHeight(),
                note.getColor(),
                note.getZIndex(),
                tags,
                noteAttachmentRepository.findByNoteIdAndKindOrderByCreatedAtAscIdAsc(note.getId(), NoteAttachmentKind.SCREENSHOT)
                        .stream()
                        .map(this::toAttachmentResponse)
                        .toList(),
                noteTaskLinkRepository.findByNoteId(note.getId()).stream().map(noteTaskLinkMapper::toResponse).toList(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
