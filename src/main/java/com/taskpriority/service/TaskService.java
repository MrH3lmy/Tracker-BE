package com.taskpriority.service;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.*;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.task.application.RecurrenceService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.UpdateTaskRequest;
import com.taskpriority.task.api.DependencyRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private static final int POSITION_STEP = 1000;

    private final TaskRepository taskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final PriorityEngine priorityEngine;
    private final RecurrenceService recurrenceService;
    private final TaskApiMapper taskApiMapper;
    private final CurrentUserService currentUserService;

    public TaskService(TaskRepository taskRepository, TaskDependencyRepository taskDependencyRepository, BoardColumnRepository boardColumnRepository, PriorityEngine priorityEngine, RecurrenceService recurrenceService, TaskApiMapper taskApiMapper, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.priorityEngine = priorityEngine;
        this.recurrenceService = recurrenceService;
        this.taskApiMapper = taskApiMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public Task save(Task task) {
        Long userId = currentUserService.requireUserId();
        if (task.getId() == null) {
            task.setUserId(userId);
        }
        validateParentTask(task);
        if (task.getStatus() == Status.DONE) {
            validateCanComplete(task);
        }
        recurrenceService.applyRecurrenceDefaults(task);
        alignBoardColumn(task);
        if (task.getPosition() <= 0) {
            task.setPosition(nextPosition(task.getBoardColumnId(), task.getStatus()));
        }
        computeDerivedFields(task);
        Task saved = taskRepository.save(task);
        computeDerivedFields(saved);
        return saved;
    }

    @Transactional
    public Task updateTask(Long id, UpdateTaskRequest request) {
        Task existing = findById(id);
        taskApiMapper.applyUpdateRequest(existing, request);
        Task saved = save(existing);
        if (request.dependencyIds() != null) {
            replaceDependencies(saved.getId(), request.dependencyIds());
            computeDerivedFields(saved);
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Task> findAll() {
        Long userId = currentUserService.requireUserId();
        List<Task> tasks = taskRepository.findByUserId(userId);
        computeDerivedFieldsBatch(tasks);
        return tasks;
    }

    @Transactional(readOnly = true)
    public Task findById(Long id) {
        return taskRepository.findById(id)
                .map(t -> { computeDerivedFields(t); return t; })
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public List<Task> findSubtasks(Long parentTaskId) {
        if (!taskRepository.existsById(parentTaskId)) {
            throw new ResourceNotFoundException("Task with id " + parentTaskId + " not found");
        }
        Long userId = currentUserService.requireUserId();
        List<Task> subtasks = taskRepository.findByUserIdAndParentTaskIdOrderByPositionAscIdAsc(userId, parentTaskId);
        computeDerivedFieldsBatch(subtasks);
        return subtasks;
    }

    @Transactional
    public Task createSubtask(Long parentTaskId, Task subtask) {
        if (!taskRepository.existsById(parentTaskId)) {
            throw new ResourceNotFoundException("Task with id " + parentTaskId + " not found");
        }
        subtask.setParentTaskId(parentTaskId);
        return save(subtask);
    }

    @Transactional
    public Task updateParent(Long id, Long parentTaskId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        task.setParentTaskId(parentTaskId);
        return save(task);
    }

    @Transactional
    public void delete(Long id) { taskRepository.deleteById(id); }

    @Transactional
    public Task addDependency(Long id, DependencyRequest request) {
        Long userId = currentUserService.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        Task blocksTask = taskRepository.findById(request.blocksTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + request.blocksTaskId() + " not found"));
        if (task.getId().equals(blocksTask.getId())) {
            throw new IllegalArgumentException("A task cannot depend on itself");
        }
        if (!taskDependencyRepository.existsByUserIdAndTaskIdAndBlocksTaskId(userId, task.getId(), blocksTask.getId())) {
            TaskDependency dependency = new TaskDependency();
            dependency.setUserId(userId);
            dependency.setTask(task);
            dependency.setBlocksTask(blocksTask);
            dependency.setDependencyType(request.dependencyType() == null ? TaskDependencyType.BLOCKS : request.dependencyType());
            taskDependencyRepository.save(dependency);
        }
        computeDerivedFields(task);
        return task;
    }

    @Transactional
    public Task removeDependency(Long id, Long blocksTaskId) {
        Long userId = currentUserService.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        taskDependencyRepository.deleteByUserIdAndTaskIdAndBlocksTaskId(userId, id, blocksTaskId);
        computeDerivedFields(task);
        return task;
    }

    @Transactional
    public Task replaceDependencies(Long id, List<Long> dependencyIds) {
        Long userId = currentUserService.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        for (TaskDependency existing : taskDependencyRepository.findByUserIdAndTaskId(userId, id)) {
            taskDependencyRepository.delete(existing);
        }
        for (Long blocksTaskId : dependencyIds.stream().distinct().toList()) {
            addDependency(id, new DependencyRequest(blocksTaskId, TaskDependencyType.BLOCKS));
        }
        computeDerivedFields(task);
        return task;
    }

    @Transactional
    public Task markComplete(Long id) {
        Task t = findById(id);
        LocalDateTime completionTimestamp = LocalDateTime.now();
        t.setStatus(Status.DONE);
        t.setCompletedDate(completionTimestamp);
        recurrenceService.completeRecurringTask(t, completionTimestamp.toLocalDate());
        return save(t);
    }

    @Transactional
    public Task updateStatus(Long id, Status status) {
        return moveTask(id, status, null, null);
    }

    @Transactional
    public Task moveTask(Long id, Status targetStatus, Long targetBoardColumnId, Integer targetPosition) {
        Long userId = currentUserService.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));

        Status resolvedStatus = targetStatus;
        Long resolvedColumnId = targetBoardColumnId;
        if (resolvedColumnId != null) {
            Long columnId = resolvedColumnId;
            BoardColumn column = boardColumnRepository.findById(columnId)
                    .orElseThrow(() -> new ResourceNotFoundException("Board column with id " + columnId + " not found"));
            if (column.getStatus() != null) {
                resolvedStatus = column.getStatus();
            }
        } else if (resolvedStatus != null) {
            resolvedColumnId = boardColumnRepository.findFirstByUserIdAndStatusOrderByPositionAsc(userId, resolvedStatus)
                    .map(BoardColumn::getId)
                    .orElse(null);
        }

        if (resolvedStatus != null) {
            if (resolvedStatus == Status.DONE) {
                validateCanComplete(task);
            }
            task.setStatus(resolvedStatus);
            if (resolvedStatus == Status.DONE && task.getCompletedDate() == null) {
                task.setCompletedDate(LocalDateTime.now());
            } else if (resolvedStatus != Status.DONE) {
                task.setCompletedDate(null);
            }
        }
        task.setBoardColumnId(resolvedColumnId);

        List<Task> columnTasks = tasksForColumn(resolvedColumnId, task.getStatus()).stream()
                .filter(existing -> !existing.getId().equals(task.getId()))
                .collect(Collectors.toCollection(java.util.ArrayList::new));
        int insertionIndex = Math.max(0, Math.min(targetPosition == null ? columnTasks.size() : targetPosition, columnTasks.size()));
        columnTasks.add(insertionIndex, task);
        renumber(columnTasks);

        Task saved = taskRepository.save(task);
        computeDerivedFields(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Task> getArchive() {
        Long userId = currentUserService.requireUserId();
        List<Task> archived = taskRepository.findByUserId(userId).stream().filter(t -> t.getStatus()==Status.DONE||t.getStatus()==Status.CANCELLED).toList();
        computeDerivedFieldsBatch(archived);
        return archived;
    }

    @Transactional(readOnly = true)
    public Map<PriorityCategory, List<Task>> getMatrixView() {
        Long userId = currentUserService.requireUserId();
        List<Task> active = taskRepository.findByUserId(userId).stream()
                .filter(t -> t.getStatus()!=Status.DONE && t.getStatus()!=Status.CANCELLED)
                .filter(t -> Area.WORK_AREAS.contains(t.getArea()))
                .toList();
        computeDerivedFieldsBatch(active);
        return active.stream().collect(Collectors.groupingBy(Task::getPriorityCategory));
    }

    private void validateParentTask(Task task) {
        Long parentTaskId = task.getParentTaskId();
        if (parentTaskId == null) {
            return;
        }
        if (task.getId() != null && task.getId().equals(parentTaskId)) {
            throw new IllegalArgumentException("A task cannot be its own parent");
        }
        Task parent = taskRepository.findById(parentTaskId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent task with id " + parentTaskId + " not found"));
        while (parent.getParentTaskId() != null) {
            if (task.getId() != null && task.getId().equals(parent.getParentTaskId())) {
                throw new IllegalArgumentException("Parent assignment would create a cycle");
            }
            Long ancestorId = parent.getParentTaskId();
            parent = taskRepository.findById(ancestorId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent task with id " + ancestorId + " not found"));
        }
    }

    private void validateCanComplete(Task task) {
        if (task.getId() == null) {
            return;
        }
        Long userId = currentUserService.requireUserId();
        if (taskRepository.existsByUserIdAndParentTaskIdAndStatusNotIn(userId, task.getId(), List.of(Status.DONE, Status.CANCELLED))) {
            throw new IllegalArgumentException("Complete or cancel all subtasks before completing the parent task");
        }
    }

    private void alignBoardColumn(Task task) {
        if (task.getStatus() == null) {
            return;
        }
        Long userId = currentUserService.requireUserId();
        if (task.getBoardColumnId() == null) {
            boardColumnRepository.findFirstByUserIdAndStatusOrderByPositionAsc(userId, task.getStatus())
                    .map(BoardColumn::getId)
                    .ifPresent(task::setBoardColumnId);
            return;
        }
        boardColumnRepository.findById(task.getBoardColumnId())
                .filter(column -> column.getStatus() == task.getStatus())
                .or(() -> boardColumnRepository.findFirstByUserIdAndStatusOrderByPositionAsc(userId, task.getStatus()))
                .map(BoardColumn::getId)
                .ifPresent(task::setBoardColumnId);
    }

    private int nextPosition(Long boardColumnId, Status status) {
        List<Task> tasks = tasksForColumn(boardColumnId, status);
        return tasks.isEmpty() ? POSITION_STEP : tasks.get(tasks.size() - 1).getPosition() + POSITION_STEP;
    }

    private List<Task> tasksForColumn(Long boardColumnId, Status status) {
        Long userId = currentUserService.requireUserId();
        if (boardColumnId != null) {
            return taskRepository.findByUserIdAndBoardColumnIdOrderByPositionAscIdAsc(userId, boardColumnId);
        }
        return taskRepository.findByUserIdAndStatusOrderByPositionAscIdAsc(userId, status);
    }

    private void renumber(List<Task> tasks) {
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setPosition((i + 1) * POSITION_STEP);
        }
    }

    public void computeDerivedFields(Task task) {
        if (task.getId() != null) {
            Long userId = currentUserService.requireUserId();
            task.setDependencyIds(taskDependencyRepository.findByUserIdAndTaskId(userId, task.getId()).stream()
                    .map(dependency -> dependency.getBlocksTask().getId())
                    .toList());
            task.setBlockingTaskIds(taskDependencyRepository.findByUserIdAndBlocksTaskId(userId, task.getId()).stream()
                    .map(dependency -> dependency.getTask().getId())
                    .toList());
            List<Task> subtasks = taskRepository.findByUserIdAndParentTaskIdOrderByPositionAscIdAsc(userId, task.getId());
            task.setSubtaskIds(subtasks.stream().map(Task::getId).toList());
            task.setSubtaskCount(subtasks.size());
            task.setCompletedSubtaskCount((int) subtasks.stream().filter(subtask -> subtask.getStatus() == Status.DONE || subtask.getStatus() == Status.CANCELLED).count());
        }
        applyPriority(task);
    }

    public void computeDerivedFieldsBatch(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return;
        }
        Long userId = currentUserService.requireUserId();
        List<Long> ids = tasks.stream().map(Task::getId).filter(Objects::nonNull).toList();

        Map<Long, List<Long>> dependencyIdsByTask = taskDependencyRepository.findByUserIdAndTaskIdIn(userId, ids).stream()
                .collect(Collectors.groupingBy(dependency -> dependency.getTask().getId(),
                        Collectors.mapping(dependency -> dependency.getBlocksTask().getId(), Collectors.toList())));
        Map<Long, List<Long>> blockingTaskIdsByTask = taskDependencyRepository.findByUserIdAndBlocksTaskIdIn(userId, ids).stream()
                .collect(Collectors.groupingBy(dependency -> dependency.getBlocksTask().getId(),
                        Collectors.mapping(dependency -> dependency.getTask().getId(), Collectors.toList())));
        Map<Long, List<Task>> subtasksByParent = taskRepository.findByUserIdAndParentTaskIdInOrderByPositionAscIdAsc(userId, ids).stream()
                .collect(Collectors.groupingBy(Task::getParentTaskId));

        for (Task task : tasks) {
            if (task.getId() != null) {
                task.setDependencyIds(dependencyIdsByTask.getOrDefault(task.getId(), List.of()));
                task.setBlockingTaskIds(blockingTaskIdsByTask.getOrDefault(task.getId(), List.of()));
                List<Task> subtasks = subtasksByParent.getOrDefault(task.getId(), List.of());
                task.setSubtaskIds(subtasks.stream().map(Task::getId).toList());
                task.setSubtaskCount(subtasks.size());
                task.setCompletedSubtaskCount((int) subtasks.stream().filter(subtask -> subtask.getStatus() == Status.DONE || subtask.getStatus() == Status.CANCELLED).count());
            }
            applyPriority(task);
        }
    }

    private void applyPriority(Task task) {
        PriorityEngine.PriorityComputation c = priorityEngine.compute(task, new PriorityEngine.DependencyContext(task.getDependencyIds().size(), task.getBlockingTaskIds().size()));
        task.setDaysLeft(c.daysLeft());task.setOverdue(c.overdue());task.setUrgent(c.urgent());task.setPriorityScore(c.priorityScore());task.setPriorityCategory(c.priorityCategory());task.setAgeFlag(c.ageFlag());task.setPriorityReason(c.priorityReason());
    }

    public record DashboardSummary(int totalTasks, int activeTasks, int completedTasks, int overdueTasks, int dueToday, int dueThisWeek, int importantTasks, int deletedTasks, int blockedTasks, int waitingTasks, double completionRate, Map<Status, Long> byStatus, Map<PriorityCategory, Long> byPriorityCategory) {}
    public record TodayView(List<Task> overdue, List<Task> dueToday, List<Task> topPriority) {}
    public record DailyPlan(LocalDate date, List<Task> tasks) {}
}
