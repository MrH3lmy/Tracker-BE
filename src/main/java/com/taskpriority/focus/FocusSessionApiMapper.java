package com.taskpriority.focus;

import com.taskpriority.model.FocusSession;
import com.taskpriority.model.Task;
import org.springframework.stereotype.Component;

@Component
public class FocusSessionApiMapper {

    public FocusSessionResponse toResponse(FocusSession session, Task task, int elapsedMinutes) {
        return new FocusSessionResponse(
                session.getId(),
                session.getTaskId(),
                task != null ? task.getTitle() : null,
                session.getStartedAt(),
                session.getEndedAt(),
                session.getStatus(),
                session.getNote(),
                session.getActualMinutes(),
                elapsedMinutes
        );
    }
}
