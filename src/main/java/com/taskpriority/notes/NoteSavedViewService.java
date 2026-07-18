package com.taskpriority.notes;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.entitlement.EntitlementService;
import com.taskpriority.model.NoteSavedView;
import com.taskpriority.notes.api.NoteSavedViewRequest;
import com.taskpriority.notes.api.NoteSavedViewResponse;
import com.taskpriority.repository.NoteSavedViewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class NoteSavedViewService {
    private static final TypeReference<Map<String, Object>> FILTERS_TYPE = new TypeReference<>() {};
    private static final java.util.List<String> SUPPORTED_VIEW_TYPES = java.util.List.of("sticky", "list", "table", "timeline");
    private final NoteSavedViewRepository repository;
    private final ObjectMapper objectMapper;
    private final CurrentUserService currentUserService;
    private final EntitlementService entitlementService;

    public NoteSavedViewService(NoteSavedViewRepository repository, ObjectMapper objectMapper, CurrentUserService currentUserService, EntitlementService entitlementService) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.currentUserService = currentUserService;
        this.entitlementService = entitlementService;
    }

    @Transactional(readOnly = true)
    public java.util.List<NoteSavedViewResponse> findAll() {
        return repository.findByUserIdOrderByNameAscIdAsc(currentUserService.requireUserId()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteSavedViewResponse create(NoteSavedViewRequest request) {
        entitlementService.assertWithinSavedViewCap();
        NoteSavedView view = new NoteSavedView();
        view.setUserId(currentUserService.requireUserId());
        apply(view, request);
        return toResponse(repository.save(view));
    }

    @Transactional
    public NoteSavedViewResponse update(Long id, NoteSavedViewRequest request) {
        NoteSavedView view = findOwned(id);
        apply(view, request);
        return toResponse(repository.save(view));
    }

    @Transactional
    public void delete(Long id) {
        NoteSavedView view = findOwned(id);
        repository.delete(view);
    }

    private NoteSavedView findOwned(Long id) {
        NoteSavedView view = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note saved view with id " + id + " not found"));
        if (!view.getUserId().equals(currentUserService.requireUserId())) {
            throw new ResourceNotFoundException("Note saved view with id " + id + " not found");
        }
        return view;
    }

    private void apply(NoteSavedView view, NoteSavedViewRequest request) {
        view.setName(request.name().trim());
        view.setFiltersJson(writeFilters(request.filters() == null ? Map.of() : request.filters()));
        view.setSortField(validatedValue(request.sortField(), "updatedAt", NoteService.SUPPORTED_NOTE_SORT_FIELDS, "sortField"));
        view.setSortDirection("asc".equalsIgnoreCase(request.sortDirection()) ? "asc" : "desc");
        view.setViewType(validatedValue(request.viewType(), "list", SUPPORTED_VIEW_TYPES, "viewType"));
    }

    private String validatedValue(String value, String fallback, java.util.List<String> supportedValues, String fieldName) {
        if (value == null || value.isBlank()) return fallback;
        String trimmed = value.trim();
        if (!supportedValues.contains(trimmed)) {
            throw new IllegalArgumentException(fieldName + " must be one of: " + String.join(", ", supportedValues));
        }
        return trimmed;
    }

    private String writeFilters(Map<String, Object> filters) {
        try { return objectMapper.writeValueAsString(filters); }
        catch (Exception ex) { throw new IllegalArgumentException("Saved view filters must be valid JSON", ex); }
    }

    private Map<String, Object> readFilters(String filtersJson) {
        try { return objectMapper.readValue(filtersJson, FILTERS_TYPE); }
        catch (Exception ex) { return Map.of(); }
    }

    private NoteSavedViewResponse toResponse(NoteSavedView view) {
        return new NoteSavedViewResponse(view.getId(), view.getName(), readFilters(view.getFiltersJson()), view.getSortField(), view.getSortDirection(), view.getViewType(), view.getCreatedAt(), view.getUpdatedAt());
    }
}
