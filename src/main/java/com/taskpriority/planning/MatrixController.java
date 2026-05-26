package com.taskpriority.planning;

import com.taskpriority.model.PriorityCategory;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import com.taskpriority.task.api.TaskResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/matrix")
public class MatrixController {
    private final TaskService taskService; private final TaskApiMapper mapper;
    public MatrixController(TaskService taskService, TaskApiMapper mapper){this.taskService=taskService;this.mapper=mapper;}
    @GetMapping public Map<PriorityCategory, List<TaskResponse>> get(){return taskService.getMatrixView().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,e->e.getValue().stream().map(mapper::toResponse).toList()));}
}
