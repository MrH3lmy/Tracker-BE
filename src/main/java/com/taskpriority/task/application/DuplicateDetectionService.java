package com.taskpriority.task.application;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DuplicateDetectionService {
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUserService;

    public DuplicateDetectionService(TaskRepository taskRepository, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<DuplicateGroup> findPotentialDuplicates() {
        Long userId = currentUserService.requireUserId();
        Map<String, List<Task>> byNormalizedTitle = taskRepository.findByUserId(userId).stream()
                .collect(Collectors.groupingBy(t -> normalize(t.getTitle())));
        List<DuplicateGroup> duplicates = new ArrayList<>();
        byNormalizedTitle.forEach((title, group) -> {
            if (group.size() > 1) duplicates.add(new DuplicateGroup(title, group));
        });
        return duplicates;
    }

    private String normalize(String s) { return s == null ? "" : s.trim().toLowerCase(); }

    public record DuplicateGroup(String normalizedTitle, List<Task> tasks) {}
}
