package com.taskpriority.notes;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.*;
import com.taskpriority.notes.api.ConvertNoteToTaskRequest;
import com.taskpriority.notes.api.ConvertNoteToTaskResponse;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoteTaskConversionService {
    private final NoteRepository noteRepository;
    private final NoteTaskLinkRepository linkRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final NoteTaskLinkMapper linkMapper;

    public NoteTaskConversionService(NoteRepository noteRepository, NoteTaskLinkRepository linkRepository, TaskService taskService, TaskApiMapper taskApiMapper, NoteTaskLinkMapper linkMapper) {
        this.noteRepository = noteRepository;
        this.linkRepository = linkRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.linkMapper = linkMapper;
    }

    @Transactional
    public ConvertNoteToTaskResponse convertSelection(Long noteId, ConvertNoteToTaskRequest request) {
        Note note = requireNote(noteId);
        return createTaskAndLink(note, request, firstNonBlank(request.selectedText(), note.getBody(), note.getTitle()));
    }

    private ConvertNoteToTaskResponse createTaskAndLink(Note note, ConvertNoteToTaskRequest request, String sourceText) {
        String title = firstNonBlank(request.title(), sourceText, note.getTitle());
        if (title.length() > 255) title = title.substring(0, 255);
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(firstNonBlank(request.description(), sourceText));
        task.setDueDate(request.dueDate());
        if (request.status() != null) task.setStatus(request.status());
        if (request.area() != null) task.setArea(request.area());
        if (request.effort() != null) task.setEffort(request.effort());
        task.setParentTaskId(request.parentTaskId());
        Task savedTask = taskService.save(task);

        NoteTaskLink link = new NoteTaskLink();
        link.setNote(note);
        link.setTask(savedTask);
        link.setSelectedText(sourceText);
        link.setLinkType("CONVERTED_SELECTION");
        NoteTaskLink savedLink = linkRepository.save(link);
        return new ConvertNoteToTaskResponse(
                taskApiMapper.toResponse(savedTask),
                linkMapper.toResponse(savedLink)
        );
    }

    private Note requireNote(Long noteId) {
        return noteRepository.findById(noteId).orElseThrow(() -> new ResourceNotFoundException("Note with id " + noteId + " not found"));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "Untitled task";
    }
}
