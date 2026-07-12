package com.taskpriority.service;

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

    public TaskService(TaskRepository taskRepository, TaskDependencyRepository taskDependencyRepository, BoardColumnRepository boardColumnRepository, PriorityEngine priorityEngine, RecurrenceService recurrenceService, TaskApiMapper taskApiMapper) {
        this.taskRepository = taskRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.priorityEngine = priorityEngine;
        this.recurrenceService = recurrenceService;
        this.taskApiMapper = taskApiMapper;
    }

    @Transactional
    public Task save(Task task) {
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
        List<Task> tasks = taskRepository.findAll();
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
        List<Task> subtasks = taskRepository.findByParentTaskIdOrderByPositionAscIdAsc(parentTaskId);
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
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        Task blocksTask = taskRepository.findById(request.blocksTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + request.blocksTaskId() + " not found"));
        if (task.getId().equals(blocksTask.getId())) {
            throw new IllegalArgumentException("A task cannot depend on itself");
        }
        if (!taskDependencyRepository.existsByTaskIdAndBlocksTaskId(task.getId(), blocksTask.getId())) {
            TaskDependency dependency = new TaskDependency();
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
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        taskDependencyRepository.deleteByTaskIdAndBlocksTaskId(id, blocksTaskId);
        computeDerivedFields(task);
        return task;
    }

    @Transactional
    public Task replaceDependencies(Long id, List<Long> dependencyIds) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
        for (TaskDependency existing : taskDependencyRepository.findByTaskId(id)) {
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
            resolvedColumnId = boardColumnRepository.findFirstByStatusOrderByPositionAsc(resolvedStatus)
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
        List<Task> archived = taskRepository.findAll().stream().filter(t -> t.getStatus()==Status.DONE||t.getStatus()==Status.CANCELLED).toList();
        computeDerivedFieldsBatch(archived);
        return archived;
    }

    @Transactional(readOnly = true)
    public Map<PriorityCategory, List<Task>> getMatrixView() {
        List<Task> active = taskRepository.findAll().stream().filter(t -> t.getStatus()!=Status.DONE && t.getStatus()!=Status.CANCELLED).toList();
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
        if (taskRepository.existsByParentTaskIdAndStatusNotIn(task.getId(), List.of(Status.DONE, Status.CANCELLED))) {
            throw new IllegalArgumentException("Complete or cancel all subtasks before completing the parent task");
        }
    }

    private void alignBoardColumn(Task task) {
        if (task.getStatus() == null) {
            return;
        }
        if (task.getBoardColumnId() == null) {
            boardColumnRepository.findFirstByStatusOrderByPositionAsc(task.getStatus())
                    .map(BoardColumn::getId)
                    .ifPresent(task::setBoardColumnId);
            return;
        }
        boardColumnRepository.findById(task.getBoardColumnId())
                .filter(column -> column.getStatus() == task.getStatus())
                .or(() -> boardColumnRepository.findFirstByStatusOrderByPositionAsc(task.getStatus()))
                .map(BoardColumn::getId)
                .ifPresent(task::setBoardColumnId);
    }

    private int nextPosition(Long boardColumnId, Status status) {
        List<Task> tasks = tasksForColumn(boardColumnId, status);
        return tasks.isEmpty() ? POSITION_STEP : tasks.get(tasks.size() - 1).getPosition() + POSITION_STEP;
    }

    private List<Task> tasksForColumn(Long boardColumnId, Status status) {
        if (boardColumnId != null) {
            return taskRepository.findByBoardColumnIdOrderByPositionAscIdAsc(boardColumnId);
        }
        return taskRepository.findByStatusOrderByPositionAscIdAsc(status);
    }

    private void renumber(List<Task> tasks) {
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setPosition((i + 1) * POSITION_STEP);
        }
    }

    public void computeDerivedFields(Task task) {
        if (task.getId() != null) {
            task.setDependencyIds(taskDependencyRepository.findByTaskId(task.getId()).stream()
                    .map(dependency -> dependency.getBlocksTask().getId())
                    .toList());
            task.setBlockingTaskIds(taskDependencyRepository.findByBlocksTaskId(task.getId()).stream()
                    .map(dependency -> dependency.getTask().getId())
                    .toList());
            List<Task> subtasks = taskRepository.findByParentTaskIdOrderByPositionAscIdAsc(task.getId());
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
        List<Long> ids = tasks.stream().map(Task::getId).filter(Objects::nonNull).toList();

        Map<Long, List<Long>> dependencyIdsByTask = taskDependencyRepository.findByTaskIdIn(ids).stream()
                .collect(Collectors.groupingBy(dependency -> dependency.getTask().getId(),
                        Collectors.mapping(dependency -> dependency.getBlocksTask().getId(), Collectors.toList())));
        Map<Long, List<Long>> blockingTaskIdsByTask = taskDependencyRepository.findByBlocksTaskIdIn(ids).stream()
                .collect(Collectors.groupingBy(dependency -> dependency.getBlocksTask().getId(),
                        Collectors.mapping(dependency -> dependency.getTask().getId(), Collectors.toList())));
        Map<Long, List<Task>> subtasksByParent = taskRepository.findByParentTaskIdInOrderByPositionAscIdAsc(ids).stream()
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
