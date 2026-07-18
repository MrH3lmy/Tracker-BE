package com.taskpriority.task.application;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Role;
import com.taskpriority.model.Task;
import com.taskpriority.model.Tier;
import com.taskpriority.repository.TaskRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DuplicateDetectionServiceTest {
    private static final Long USER_ID = 1L;

    private Task task(Long id, String title) {
        Task task = new Task();
        task.setId(id);
        task.setTitle(title);
        return task;
    }

    private CurrentUserService currentUserService() {
        CurrentUserService currentUserService = mock(CurrentUserService.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(USER_ID, "u@example.com", Tier.FREE, Role.USER));
        return currentUserService;
    }

    @Test
    void returnsNoGroupsWhenAllTitlesAreUnique() {
        TaskRepository repository = mock(TaskRepository.class);
        when(repository.findByUserId(USER_ID)).thenReturn(List.of(task(1L, "Write report"), task(2L, "Fix bug")));
        DuplicateDetectionService service = new DuplicateDetectionService(repository, currentUserService());

        assertTrue(service.findPotentialDuplicates().isEmpty());
    }

    @Test
    void groupsTasksWithMatchingTitlesIgnoringCaseAndWhitespace() {
        TaskRepository repository = mock(TaskRepository.class);
        when(repository.findByUserId(USER_ID)).thenReturn(List.of(
                task(1L, "Write Report"),
                task(2L, "  write report  "),
                task(3L, "Fix bug")
        ));
        DuplicateDetectionService service = new DuplicateDetectionService(repository, currentUserService());

        List<DuplicateDetectionService.DuplicateGroup> duplicates = service.findPotentialDuplicates();

        assertEquals(1, duplicates.size());
        assertEquals("write report", duplicates.get(0).normalizedTitle());
        assertEquals(2, duplicates.get(0).tasks().size());
    }

    @Test
    void treatsNullTitlesAsOneGroup() {
        TaskRepository repository = mock(TaskRepository.class);
        when(repository.findByUserId(USER_ID)).thenReturn(List.of(task(1L, null), task(2L, null)));
        DuplicateDetectionService service = new DuplicateDetectionService(repository, currentUserService());

        List<DuplicateDetectionService.DuplicateGroup> duplicates = service.findPotentialDuplicates();

        assertEquals(1, duplicates.size());
        assertEquals("", duplicates.get(0).normalizedTitle());
    }
}
