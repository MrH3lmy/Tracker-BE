package com.taskpriority.task.application;

import com.taskpriority.model.Task;
import org.springframework.stereotype.Service;

@Service
public class RecurrenceService {
    public void applyRecurrenceDefaults(Task task) {
        if (task.getRecurrenceRule() != null && task.getRecurrenceRule().getFrequency() == null) {
            task.setRecurrenceRule(null);
        }
    }
}
