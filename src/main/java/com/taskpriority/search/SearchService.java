package com.taskpriority.search;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Note;
import com.taskpriority.model.Tag;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteSpecifications;
import com.taskpriority.repository.TagRepository;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Free-text search across tasks, notes, habits, and tags, scoped to the current user.
 * Filters (type/status/due/area/tag) narrow each entity's contribution before results
 * are merged, sorted, and paginated in memory -- consistent with how every other
 * per-user aggregation in this codebase (DashboardService, TaskRecommendationService,
 * HomeService) works: one bounded findByUserId scan, not a per-row query.
 */
@Service
public class SearchService {
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int SNIPPET_LENGTH = 160;

    private final TaskRepository taskRepository;
    private final NoteRepository noteRepository;
    private final HabitRepository habitRepository;
    private final TagRepository tagRepository;
    private final CurrentUserService currentUserService;

    public SearchService(TaskRepository taskRepository, NoteRepository noteRepository, HabitRepository habitRepository,
                          TagRepository tagRepository, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.noteRepository = noteRepository;
        this.habitRepository = habitRepository;
        this.tagRepository = tagRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(String q, String type, String status, String due, String area, String tag, Integer page, Integer size) {
        Long userId = currentUserService.requireUserId();
        String query = q == null ? "" : q.trim();
        int pageNumber = page == null || page < 0 ? 0 : page;
        int pageSize = page == null && size == null ? DEFAULT_PAGE_SIZE : clampPageSize(size);

        List<SearchResultItem> results = new ArrayList<>();
        if (includesType(type, "task")) results.addAll(searchTasks(userId, query, status, due, area));
        if (includesType(type, "note")) results.addAll(searchNotes(userId, query, tag));
        if (includesType(type, "habit")) results.addAll(searchHabits(userId, query, area));
        if (includesType(type, "tag")) results.addAll(searchTags(userId, query));

        results.sort(Comparator.comparing(SearchResultItem::title, String.CASE_INSENSITIVE_ORDER));

        int totalElements = results.size();
        int fromIndex = Math.min(pageNumber * pageSize, totalElements);
        int toIndex = Math.min(fromIndex + pageSize, totalElements);
        return new SearchResponse(results.subList(fromIndex, toIndex), pageNumber, pageSize, totalElements);
    }

    private int clampPageSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private boolean includesType(String type, String candidate) {
        return type == null || type.isBlank() || type.equalsIgnoreCase(candidate);
    }

    private boolean containsIgnoreCase(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private List<SearchResultItem> searchTasks(Long userId, String query, String status, String due, String area) {
        LocalDate today = LocalDate.now();
        return taskRepository.findByUserId(userId).stream()
                .filter(task -> !task.isDeleted())
                .filter(task -> query.isEmpty() || containsIgnoreCase(task.getTitle(), query))
                .filter(task -> status == null || status.isBlank() || task.getStatus().name().equalsIgnoreCase(status))
                .filter(task -> area == null || area.isBlank() || (task.getArea() != null && task.getArea().name().equalsIgnoreCase(area)))
                .filter(task -> matchesDueFilter(task.getDueDate(), due, today))
                .map(task -> new SearchResultItem("TASK", task.getId(), task.getTitle(), snippetOf(task.getDescription()), "/tasks/" + task.getId()))
                .toList();
    }

    private boolean matchesDueFilter(LocalDate dueDate, String due, LocalDate today) {
        if (due == null || due.isBlank()) return true;
        if (dueDate == null) return false;
        return switch (due.toLowerCase(Locale.ROOT)) {
            case "overdue" -> dueDate.isBefore(today);
            case "today" -> dueDate.isEqual(today);
            case "this-week" -> !dueDate.isBefore(today) && !dueDate.isAfter(today.plusDays(6));
            default -> true;
        };
    }

    private List<SearchResultItem> searchNotes(Long userId, String query, String tag) {
        List<String> tagFilter = (tag == null || tag.isBlank()) ? null : List.of(tag);
        var spec = NoteSpecifications.matching(userId, null, null, query.isEmpty() ? null : query, null, null, null, null, null, null, null, null, tagFilter, "any");
        List<Note> notes = noteRepository.findAll(spec);
        return notes.stream()
                .map(note -> new SearchResultItem("NOTE", note.getId(), note.getTitle(), snippetOf(note.getBody()), "/notes?q=" + urlEncode(note.getTitle())))
                .toList();
    }

    private String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private List<SearchResultItem> searchHabits(Long userId, String query, String area) {
        return habitRepository.findByUserId(userId).stream()
                .filter(habit -> !habit.isDeleted())
                .filter(habit -> query.isEmpty() || containsIgnoreCase(habit.getTitle(), query))
                .filter(habit -> area == null || area.isBlank() || (habit.getArea() != null && habit.getArea().name().equalsIgnoreCase(area)))
                .map(habit -> new SearchResultItem("HABIT", habit.getId(), habit.getTitle(), snippetOf(habit.getDescription()), "/habits"))
                .toList();
    }

    private List<SearchResultItem> searchTags(Long userId, String query) {
        List<Tag> tags = query.isEmpty()
                ? tagRepository.findByUserId(userId)
                : tagRepository.findByUserIdAndNameContainingIgnoreCase(userId, query);
        return tags.stream()
                .map(tag -> new SearchResultItem("TAG", tag.getId(), tag.getName(), null, "/notes?tag=" + urlEncode(tag.getName())))
                .toList();
    }

    private String snippetOf(String text) {
        if (text == null || text.isBlank()) return null;
        String trimmed = text.trim();
        return trimmed.length() <= SNIPPET_LENGTH ? trimmed : trimmed.substring(0, SNIPPET_LENGTH) + "...";
    }
}
