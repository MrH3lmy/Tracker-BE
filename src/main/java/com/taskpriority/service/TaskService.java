package com.taskpriority.service;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.*;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.task.application.RecurrenceService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.UpdateTaskRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private static final int POSITION_STEP = 1000;

    private final TaskRepository taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final PriorityEngine priorityEngine;
    private final RecurrenceService recurrenceService;
    private final TaskApiMapper taskApiMapper;

    public TaskService(TaskRepository taskRepository, BoardColumnRepository boardColumnRepository, PriorityEngine priorityEngine, RecurrenceService recurrenceService, TaskApiMapper taskApiMapper) {
        this.taskRepository = taskRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.priorityEngine = priorityEngine;
        this.recurrenceService = recurrenceService;
        this.taskApiMapper = taskApiMapper;
    }

    @Transactional
    public Task save(Task task) {
        recurrenceService.applyRecurrenceDefaults(task);
        alignBoardColumn(task);
        if (task.getPosition() <= 0) {
            task.setPosition(nextPosition(task.getBoardColumnId(), task.getStatus()));
        }
        computeDerivedFields(task);
        return taskRepository.save(task);
    }

    @Transactional
    public Task updateTask(Long id, UpdateTaskRequest request) {
        Task existing = findById(id);
        taskApiMapper.applyUpdateRequest(existing, request);
        return save(existing);
    }

    @Transactional(readOnly = true)
    public List<Task> findAll() { return taskRepository.findAll().stream().peek(this::computeDerivedFields).toList(); }

    @Transactional(readOnly = true)
    public Task findById(Long id) {
        return taskRepository.findById(id)
                .map(t -> { computeDerivedFields(t); return t; })
                .orElseThrow(() -> new ResourceNotFoundException("Task with id " + id + " not found"));
    }

    @Transactional
    public void delete(Long id) { taskRepository.deleteById(id); }

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
    public List<Task> getArchive() { return taskRepository.findAll().stream().filter(t -> t.getStatus()==Status.DONE||t.getStatus()==Status.CANCELLED).peek(this::computeDerivedFields).toList(); }

    @Transactional(readOnly = true)
    public Map<PriorityCategory, List<Task>> getMatrixView() {
        return taskRepository.findAll().stream().filter(t -> t.getStatus()!=Status.DONE && t.getStatus()!=Status.CANCELLED).peek(this::computeDerivedFields)
                .collect(Collectors.groupingBy(Task::getPriorityCategory));
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
        PriorityEngine.PriorityComputation c = priorityEngine.compute(task);
        task.setDaysLeft(c.daysLeft());task.setOverdue(c.overdue());task.setUrgent(c.urgent());task.setPriorityScore(c.priorityScore());task.setPriorityCategory(c.priorityCategory());task.setAgeFlag(c.ageFlag());task.setPriorityReason(c.priorityReason());
    }

    public record DashboardSummary(int totalTasks, int activeTasks, int completedTasks, int overdueTasks, int dueToday, int dueThisWeek, int importantTasks, int deletedTasks, int blockedTasks, int waitingTasks, double completionRate, Map<Status, Long> byStatus, Map<PriorityCategory, Long> byPriorityCategory) {}
    public record TodayView(List<Task> overdue, List<Task> dueToday, List<Task> topPriority) {}
    public record DailyPlan(LocalDate date, List<Task> tasks) {}
}
