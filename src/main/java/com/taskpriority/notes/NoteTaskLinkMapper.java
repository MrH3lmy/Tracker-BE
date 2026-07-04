package com.taskpriority.notes;

import com.taskpriority.model.NoteTaskLink;
import com.taskpriority.notes.api.NoteTaskLinkResponse;
import org.springframework.stereotype.Component;

@Component
public class NoteTaskLinkMapper {
    public NoteTaskLinkResponse toResponse(NoteTaskLink link) {
        return new NoteTaskLinkResponse(
                link.getId(),
                link.getNote().getId(),
                link.getNoteBlock() == null ? null : link.getNoteBlock().getId(),
                link.getTask().getId(),
                link.getTask().getTitle(),
                link.getSelectedText(),
                link.getCreatedAt()
        );
    }
}
