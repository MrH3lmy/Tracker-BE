package com.taskpriority.task.application;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Task;
import com.taskpriority.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ImportService {
    private static final List<String> REQUIRED_COLUMNS = List.of("title", "description", "dueDate", "status", "important", "area", "effort");
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUserService;
    public ImportService(TaskRepository taskRepository, CurrentUserService currentUserService) {
        this.taskRepository = taskRepository;
        this.currentUserService = currentUserService;
    }

    public record ImportResult(int importedCount, int skippedCount, List<String> validationErrors) {}

    @Transactional
    public List<Task> importCsv(String csv) {
        Long userId = currentUserService.requireUserId();
        List<Task> imported = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new StringReader(csv))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank() || line.toLowerCase().startsWith("title")) continue;
                Task t = new Task();
                t.setUserId(userId);
                t.setTitle(line.split(",")[0].trim());
                imported.add(taskRepository.save(t));
            }
            return imported;
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid CSV payload", e);
        }
    }

    @Transactional
    public ImportResult importTasksCsv(String csv) {
        Long userId = currentUserService.requireUserId();
        List<String> errors = new ArrayList<>();
        int importedCount = 0;
        int skippedCount = 0;
        try (BufferedReader br = new BufferedReader(new StringReader(csv))) {
            String headerLine = br.readLine();
            if (headerLine == null || headerLine.isBlank()) {
                return new ImportResult(0, 0, List.of("CSV header is required"));
            }
            List<String> headers = Arrays.stream(headerLine.split(",", -1)).map(String::trim).toList();
            if (!headers.equals(REQUIRED_COLUMNS)) {
                return new ImportResult(0, 0, List.of("CSV columns must exactly match: " + String.join(",", REQUIRED_COLUMNS)));
            }
            Map<String, Integer> idx = java.util.stream.IntStream.range(0, headers.size()).boxed().collect(Collectors.toMap(headers::get, i -> i));
            String line;
            int row = 1;
            while ((line = br.readLine()) != null) {
                row++;
                if (line.isBlank()) { skippedCount++; continue; }
                String[] cols = line.split(",", -1);
                if (cols.length != headers.size()) {
                    skippedCount++;
                    errors.add("Row " + row + ": invalid column count");
                    continue;
                }
                try {
                    Task t = new Task();
                    t.setUserId(userId);
                    String title = cols[idx.get("title")].trim();
                    if (title.isBlank()) throw new IllegalArgumentException("title is required");
                    t.setTitle(title);
                    t.setDescription(cols[idx.get("description")].trim());
                    String dueDateValue = cols[idx.get("dueDate")].trim();
                    t.setDueDate(dueDateValue.isBlank() ? null : LocalDate.parse(dueDateValue));
                    t.setStatus(com.taskpriority.model.Status.valueOf(cols[idx.get("status")].trim().toUpperCase(Locale.ROOT)));
                    t.setImportant(Boolean.parseBoolean(cols[idx.get("important")].trim()));
                    t.setArea(com.taskpriority.model.Area.valueOf(cols[idx.get("area")].trim().toUpperCase(Locale.ROOT)));
                    t.setEffort(com.taskpriority.model.Effort.valueOf(cols[idx.get("effort")].trim().toUpperCase(Locale.ROOT)));
                    taskRepository.save(t);
                    importedCount++;
                } catch (Exception ex) {
                    skippedCount++;
                    errors.add("Row " + row + ": " + ex.getMessage());
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid CSV payload", e);
        }
        return new ImportResult(importedCount, skippedCount, errors);
    }
}
