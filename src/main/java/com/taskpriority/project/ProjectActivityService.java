package com.taskpriority.project;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.ActivityEntityType;
import com.taskpriority.model.ActivityEventType;
import com.taskpriority.model.ProjectActivity;
import com.taskpriority.repository.ProjectActivityRepository;
import com.taskpriority.repository.ProjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Append-only project activity timeline (issue #288) - not event sourcing; tasks/notes/projects
 * stay the source of truth, this just records that something happened for a chronological feed.
 */
@Service
public class ProjectActivityService {
    private final ProjectActivityRepository repository;
    private final ProjectRepository projectRepository;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    public ProjectActivityService(ProjectActivityRepository repository, ProjectRepository projectRepository,
                                   CurrentUserService currentUserService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.currentUserService = currentUserService;
        this.objectMapper = objectMapper;
    }

    /**
     * Writes one activity row. Deliberately plain {@code @Transactional} (REQUIRED propagation,
     * the default) rather than {@code REQUIRES_NEW}: every caller (ProjectService.create,
     * TaskService.save, NoteService.create, ...) is already inside its own {@code @Transactional}
     * domain mutation, so this call joins that same transaction instead of opening a new one - the
     * activity row commits or rolls back atomically with the domain change, never as a separate
     * best-effort write after the fact.
     */
    @Transactional
    public void record(Long projectId, ActivityEventType eventType, ActivityEntityType entityType, Long entityId,
                        String summary, Map<String, Object> metadata) {
        Long userId = currentUserService.requireUserId();
        ProjectActivity activity = new ProjectActivity();
        activity.setUserId(userId);
        activity.setProjectId(projectId);
        activity.setActorUserId(userId);
        activity.setEventType(eventType);
        activity.setEntityType(entityType);
        activity.setEntityId(entityId);
        activity.setSummary(summary);
        activity.setMetadata(serializeMetadata(metadata));
        repository.save(activity);
    }

    @Transactional(readOnly = true)
    public Page<ProjectActivityResponse> findPage(Long projectId, Pageable pageable) {
        Long userId = currentUserService.requireUserId();
        if (!projectRepository.existsByUserIdAndId(userId, projectId)) {
            throw new ResourceNotFoundException("Project with id " + projectId + " not found");
        }
        return repository.findByUserIdAndProjectId(userId, projectId, pageable).map(this::toResponse);
    }

    private ProjectActivityResponse toResponse(ProjectActivity activity) {
        return new ProjectActivityResponse(
                activity.getId(),
                activity.getProjectId(),
                activity.getActorUserId(),
                activity.getEventType(),
                activity.getEntityType(),
                activity.getEntityId(),
                activity.getSummary(),
                deserializeMetadata(activity.getMetadata()),
                activity.getOccurredAt()
        );
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize activity metadata", ex);
        }
    }

    private Map<String, Object> deserializeMetadata(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }
}
