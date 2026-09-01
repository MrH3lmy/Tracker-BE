package com.taskpriority.notes;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.ActivityEntityType;
import com.taskpriority.model.ActivityEventType;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.NoteTaskLink;
import com.taskpriority.model.Task;
import com.taskpriority.notes.api.ConvertNoteToTaskRequest;
import com.taskpriority.notes.api.ConvertNoteToTaskResponse;
import com.taskpriority.project.ProjectActivityService;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.service.TaskService;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * The actual task+link write for note-to-task conversion (issue #287), split out of
 * {@link NoteTaskConversionService} so the action-item path can run in its own nested transaction
 * (see {@link #createActionItemTaskAndLink}) - a separate bean is required for
 * {@code @Transactional(REQUIRES_NEW)} to take effect, since Spring's transactional proxying
 * doesn't apply to a method called on {@code this} from within the same class.
 */
@Service
public class NoteTaskConversionWriter {
    static final String ACTION_ITEM_LINK_TYPE = "ACTION_ITEM_CONVERSION";
    static final String FREE_TEXT_LINK_TYPE = "CONVERTED_SELECTION";

    private final NoteTaskLinkRepository linkRepository;
    private final TaskService taskService;
    private final TaskApiMapper taskApiMapper;
    private final NoteTaskLinkMapper linkMapper;
    private final CurrentUserService currentUserService;
    private final ProjectActivityService activityService;

    public NoteTaskConversionWriter(NoteTaskLinkRepository linkRepository, TaskService taskService, TaskApiMapper taskApiMapper,
                                     NoteTaskLinkMapper linkMapper, CurrentUserService currentUserService, ProjectActivityService activityService) {
        this.linkRepository = linkRepository;
        this.taskService = taskService;
        this.taskApiMapper = taskApiMapper;
        this.linkMapper = linkMapper;
        this.currentUserService = currentUserService;
        this.activityService = activityService;
    }

    /**
     * Runs in its own, independent transaction. Two concurrent requests can both pass
     * {@code NoteTaskConversionService}'s existing-link pre-check and both reach here for the same
     * (note, block); V53's partial unique index lets only one of the two {@code saveAndFlush} calls
     * below succeed. Because this method is REQUIRES_NEW, the loser's constraint violation rolls
     * back only *this* transaction (its task insert included) - never the caller's - so the caller
     * can safely catch the exception and re-read the row the winner committed, instead of that
     * violation surfacing to the client as an error.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ConvertNoteToTaskResponse createActionItemTaskAndLink(Note note, NoteBlock block, ConvertNoteToTaskRequest request, String sourceText) {
        return createAndSave(note, block, request, sourceText, ACTION_ITEM_LINK_TYPE);
    }

    /** Free-text/whole-note conversion has no uniqueness constraint to race on - plain transaction, joins the caller's if any. */
    @Transactional
    public ConvertNoteToTaskResponse createFreeTextTaskAndLink(Note note, ConvertNoteToTaskRequest request, String sourceText) {
        return createAndSave(note, null, request, sourceText, FREE_TEXT_LINK_TYPE);
    }

    private ConvertNoteToTaskResponse createAndSave(Note note, NoteBlock block, ConvertNoteToTaskRequest request, String sourceText, String linkType) {
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
        // Flushed immediately (not just save()) so a conflicting concurrent insert throws right
        // here, inside this method's own transaction, rather than at some later, uncontrolled
        // flush point - see the REQUIRES_NEW javadoc above for why that matters.
        NoteTaskLink savedLink = linkRepository.saveAndFlush(link);

        // Distinct from the generic TASK_CREATED that TaskService.save() above already recorded
        // (issue #288's minimum event list wants both): this one specifically marks "a task was
        // produced from a note", which TASK_CREATED alone doesn't convey.
        if (note.getProjectId() != null) {
            activityService.record(note.getProjectId(), ActivityEventType.NOTE_TASK_CREATED, ActivityEntityType.TASK,
                    savedTask.getId(), "Created task \"" + savedTask.getTitle() + "\" from note \"" + note.getTitle() + "\"",
                    Map.of("noteId", note.getId()));
        }
        return new ConvertNoteToTaskResponse(taskApiMapper.toResponse(savedTask), linkMapper.toResponse(savedLink));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "Untitled task";
    }
}
