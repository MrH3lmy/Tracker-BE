package com.taskpriority.search;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import com.taskpriority.model.Note;
import com.taskpriority.model.Role;
import com.taskpriority.model.Status;
import com.taskpriority.model.Tag;
import com.taskpriority.model.Task;
import com.taskpriority.model.Tier;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.TagRepository;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SearchServiceTest {
    private static final Long USER_ID = 1L;

    private TaskRepository taskRepository;
    private NoteRepository noteRepository;
    private HabitRepository habitRepository;
    private TagRepository tagRepository;
    private SearchService searchService;

    private Task task(Long id, String title, Status status, Area area, LocalDate dueDate) {
        Task task = new Task(title);
        task.setId(id);
        task.setStatus(status);
        task.setArea(area);
        task.setDueDate(dueDate);
        return task;
    }

    private Habit habit(Long id, String title, Area area) {
        Habit habit = new Habit(title);
        habit.setId(id);
        habit.setArea(area);
        return habit;
    }

    @BeforeEach
    void setUp() {
        taskRepository = mock(TaskRepository.class);
        noteRepository = mock(NoteRepository.class);
        habitRepository = mock(HabitRepository.class);
        tagRepository = mock(TagRepository.class);
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(USER_ID, "u@example.com", Tier.FREE, Role.USER));
        when(noteRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of());
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of());
        searchService = new SearchService(taskRepository, noteRepository, habitRepository, tagRepository, currentUserService);
    }

    @Test
    void findsTasksMatchingTitleCaseInsensitively() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(
                task(1L, "Renew passport", Status.NOT_STARTED, Area.PERSONAL, null),
                task(2L, "Buy groceries", Status.NOT_STARTED, Area.PERSONAL, null)
        ));

        SearchResponse response = searchService.search("passport", null, null, null, null, null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("TASK", response.items().get(0).type());
        assertEquals("Renew passport", response.items().get(0).title());
        assertEquals("/tasks/1", response.items().get(0).url());
    }

    @Test
    void excludesDeletedTasksFromResults() {
        Task deleted = task(3L, "Deleted matching task", Status.NOT_STARTED, Area.WORK, null);
        deleted.setDeleted(true);
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(deleted));

        SearchResponse response = searchService.search("matching", null, null, null, null, null, null, null);

        assertTrue(response.items().isEmpty());
    }

    @Test
    void filtersTasksByStatus() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(
                task(1L, "Blocked task", Status.BLOCKED, Area.WORK, null),
                task(2L, "Active task", Status.NOT_STARTED, Area.WORK, null)
        ));

        SearchResponse response = searchService.search("", "task", "BLOCKED", null, null, null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("Blocked task", response.items().get(0).title());
    }

    @Test
    void filtersTasksByDueThisWeek() {
        LocalDate today = LocalDate.now();
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(
                task(1L, "Due this week", Status.NOT_STARTED, Area.WORK, today.plusDays(2)),
                task(2L, "Due far out", Status.NOT_STARTED, Area.WORK, today.plusDays(30)),
                task(3L, "No due date", Status.NOT_STARTED, Area.WORK, null)
        ));

        SearchResponse response = searchService.search("", "task", null, "this-week", null, null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("Due this week", response.items().get(0).title());
    }

    @Test
    void filtersHabitsByArea() {
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of(
                habit(1L, "Morning run", Area.HEALTH),
                habit(2L, "Read a book", Area.PERSONAL)
        ));

        SearchResponse response = searchService.search("", "habit", null, null, "HEALTH", null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("Morning run", response.items().get(0).title());
    }

    @Test
    void onlyReturnsTheRequestedTypeWhenTypeFilterIsSet() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(task(1L, "Ship widget", Status.NOT_STARTED, Area.WORK, null)));
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of(habit(2L, "Ship widget habit", Area.WORK)));

        SearchResponse response = searchService.search("ship", "task", null, null, null, null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("TASK", response.items().get(0).type());
    }

    @Test
    void searchesTagsByNameContains() {
        Tag tag = new Tag("decision-log");
        tag.setId(5L);
        when(tagRepository.findByUserIdAndNameContainingIgnoreCase(USER_ID, "decision")).thenReturn(List.of(tag));

        SearchResponse response = searchService.search("decision", "tag", null, null, null, null, null, null);

        assertEquals(1, response.items().size());
        assertEquals("TAG", response.items().get(0).type());
        assertEquals("decision-log", response.items().get(0).title());
    }

    @Test
    void sortsResultsAlphabeticallyByTitleAcrossTypes() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(task(1L, "Zebra task", Status.NOT_STARTED, Area.WORK, null)));
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of(habit(2L, "Apple habit", Area.WORK)));

        SearchResponse response = searchService.search("", null, null, null, null, null, null, null);

        assertEquals(2, response.items().size());
        assertEquals("Apple habit", response.items().get(0).title());
        assertEquals("Zebra task", response.items().get(1).title());
    }

    @Test
    void paginatesResults() {
        when(taskRepository.findByUserId(USER_ID)).thenReturn(List.of(
                task(1L, "Task A", Status.NOT_STARTED, Area.WORK, null),
                task(2L, "Task B", Status.NOT_STARTED, Area.WORK, null),
                task(3L, "Task C", Status.NOT_STARTED, Area.WORK, null)
        ));

        SearchResponse firstPage = searchService.search("", "task", null, null, null, null, 0, 2);
        SearchResponse secondPage = searchService.search("", "task", null, null, null, null, 1, 2);

        assertEquals(2, firstPage.items().size());
        assertEquals(3, firstPage.totalElements());
        assertEquals(1, secondPage.items().size());
        assertEquals("Task C", secondPage.items().get(0).title());
    }
}
