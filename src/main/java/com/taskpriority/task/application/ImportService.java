package com.taskpriority.task.application;

import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImportService {
    private final TaskRepository taskRepository;
    public ImportService(TaskRepository taskRepository) { this.taskRepository = taskRepository; }

    @Transactional
    public List<Task> importCsv(String csv) {
        List<Task> imported = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new StringReader(csv))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank() || line.toLowerCase().startsWith("title")) continue;
                Task t = new Task();
                t.setTitle(line.split(",")[0].trim());
                imported.add(taskRepository.save(t));
            }
            return imported;
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid CSV payload", e);
        }
    }
}
