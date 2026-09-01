package com.taskpriority.notes;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.*;
import com.taskpriority.notes.api.ConvertNoteToTaskRequest;
import com.taskpriority.notes.api.ConvertNoteToTaskResponse;
import com.taskpriority.project.ProjectActivityService;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class NoteTaskConversionService {
    /** Marks a link as the (note, block) action item that produced its task - see V53's dedup index. */
    private static final String ACTION_ITEM_LINK_TYPE = "ACTION_ITEM_CONVERSION";
    private static final String FREE_TEXT_LINK_TYPE = "CONVERTED_SELECTION";

    private final NoteRepository noteRepository;
    private final NoteBlockRepository noteBlockRepository;
    private final NoteTaskLinkRepository linkRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final NoteTaskLinkMapper linkMapper;
    private final CurrentUserService currentUserService;
    private final ProjectActivityService activityService;

    public NoteTaskConversionService(NoteRepository noteRepository, NoteBlockRepository noteBlockRepository, NoteTaskLinkRepository linkRepository, TaskService taskService, TaskApiMapper taskApiMapper, NoteTaskLinkMapper linkMapper, CurrentUserService currentUserService, ProjectActivityService activityService) {
        this.noteRepository = noteRepository;
        this.noteBlockRepository = noteBlockRepository;
        this.linkRepository = linkRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.linkMapper = linkMapper;
        this.currentUserService = currentUserService;
        this.activityService = activityService;
    }

    /**
     * Converts either a free-text selection (no {@code noteBlockId} - unchanged, always creates a
     * new task) or a specific meeting-note action item ({@code noteBlockId} present - idempotent:
     * a repeat request for the same (note, block) returns the task/link already created for it
     * instead of creating a duplicate; see V53's partial unique index for the DB-level guarantee
     * behind the pre-check below).
     */
    @Transactional
    public ConvertNoteToTaskResponse convertSelection(Long noteId, ConvertNoteToTaskRequest request) {
        Long userId = currentUserService.requireUserId();
        Note note = requireNote(userId, noteId);

        if (request.noteBlockId() != null) {
            NoteBlock block = noteBlockRepository.findByUserIdAndIdAndNoteId(userId, request.noteBlockId(), noteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Block with id " + request.noteBlockId() + " not found for note " + noteId));
            var existing = linkRepository.findByUserIdAndNoteIdAndNoteBlockIdAndLinkType(userId, noteId, block.getId(), ACTION_ITEM_LINK_TYPE);
            if (existing.isPresent()) {
                NoteTaskLink link = existing.get();
                return new ConvertNoteToTaskResponse(taskApiMapper.toResponse(link.getTask()), linkMapper.toResponse(link));
            }
            String sourceText = firstNonBlank(request.selectedText(), block.getContent(), note.getBody(), note.getTitle());
            return createTaskAndLink(note, block, request, sourceText, ACTION_ITEM_LINK_TYPE);
        }

        String sourceText = firstNonBlank(request.selectedText(), note.getBody(), note.getTitle());
        return createTaskAndLink(note, null, request, sourceText, FREE_TEXT_LINK_TYPE);
    }

    private ConvertNoteToTaskResponse createTaskAndLink(Note note, NoteBlock block, ConvertNoteToTaskRequest request, String sourceText, String linkType) {
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
        // Traceability (issue #287): the task remembers the note it came from...
        task.setSourceNoteId(note.getId());
        // ...and inherits the note's project, if any, so converting an action item doesn't
        // require a separate step to put the resulting task in the right project.
        task.setProjectId(note.getProjectId());
        Task savedTask = taskService.save(task);

        NoteTaskLink link = new NoteTaskLink();
        link.setUserId(currentUserService.requireUserId());
        link.setNote(note);
        link.setNoteBlock(block);
        link.setTask(savedTask);
        link.setSelectedText(sourceText);
        link.setLinkType(linkType);
        NoteTaskLink savedLink = linkRepository.save(link);
        // Distinct from the generic TASK_CREATED that TaskService.save() above already recorded
        // (issue #288's minimum event list wants both): this one specifically marks "a task was
        // produced from a note", which TASK_CREATED alone doesn't convey.
        if (note.getProjectId() != null) {
            activityService.record(note.getProjectId(), ActivityEventType.NOTE_TASK_CREATED, ActivityEntityType.TASK,
                    savedTask.getId(), "Created task \"" + savedTask.getTitle() + "\" from note \"" + note.getTitle() + "\"",
                    Map.of("noteId", note.getId()));
        }
        return new ConvertNoteToTaskResponse(
                taskApiMapper.toResponse(savedTask),
                linkMapper.toResponse(savedLink)
        );
    }

    private Note requireNote(Long userId, Long noteId) {
        return noteRepository.findByUserIdAndId(userId, noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note with id " + noteId + " not found"));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "Untitled task";
    }
}
