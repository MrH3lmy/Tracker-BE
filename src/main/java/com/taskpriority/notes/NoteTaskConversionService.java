package com.taskpriority.notes;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.NoteTaskLink;
import com.taskpriority.notes.api.ConvertNoteToTaskRequest;
import com.taskpriority.notes.api.ConvertNoteToTaskResponse;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.NoteTaskLinkRepository;
import com.taskpriority.task.api.TaskApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.taskpriority.notes.NoteTaskConversionWriter.ACTION_ITEM_LINK_TYPE;

@Service
public class NoteTaskConversionService {
    private final NoteRepository noteRepository;
    private final NoteBlockRepository noteBlockRepository;
    private final NoteTaskLinkRepository linkRepository;
    private final NoteTaskConversionWriter writer;
    private final TaskApiMapper taskApiMapper;
    private final NoteTaskLinkMapper linkMapper;
    private final CurrentUserService currentUserService;

    public NoteTaskConversionService(NoteRepository noteRepository, NoteBlockRepository noteBlockRepository, NoteTaskLinkRepository linkRepository,
                                      NoteTaskConversionWriter writer, TaskApiMapper taskApiMapper, NoteTaskLinkMapper linkMapper,
                                      CurrentUserService currentUserService) {
        this.noteRepository = noteRepository;
        this.noteBlockRepository = noteBlockRepository;
        this.linkRepository = linkRepository;
        this.writer = writer;
        this.taskApiMapper = taskApiMapper;
        this.linkMapper = linkMapper;
        this.currentUserService = currentUserService;
    }

    /**
     * Converts either a free-text selection (no {@code noteBlockId} - always creates a new task)
     * or a specific meeting-note action item ({@code noteBlockId} present - idempotent per (note,
     * block); see {@link #convertActionItem} for how concurrent duplicate requests are handled).
     */
    @Transactional
    public ConvertNoteToTaskResponse convertSelection(Long noteId, ConvertNoteToTaskRequest request) {
        Long userId = currentUserService.requireUserId();
        Note note = requireNote(userId, noteId);

        if (request.noteBlockId() != null) {
            return convertActionItem(userId, note, request.noteBlockId(), request);
        }

        String sourceText = firstNonBlank(request.selectedText(), note.getBody(), note.getTitle());
        return writer.createFreeTextTaskAndLink(note, request, sourceText);
    }

    /**
     * Idempotent per (note, block). Takes a {@code SELECT ... FOR UPDATE} row lock on the target
     * block (via {@link NoteBlockRepository#findByUserIdAndIdAndNoteIdForUpdate}) before checking
     * for an existing link, all within this single transaction/connection - a second concurrent
     * caller for the same block blocks on that lock until the first caller's transaction commits,
     * then re-runs the same check-then-create and finds the row the first caller just committed.
     * Two concurrent callers therefore always resolve to the same task/link, never a duplicate and
     * never a 4xx/5xx purely because they raced, without ever needing a second, independently
     * pooled connection per in-flight request (see {@link NoteTaskConversionWriter}). V53's partial
     * unique index remains as the final DB-level invariant if this lock is ever bypassed.
     */
    private ConvertNoteToTaskResponse convertActionItem(Long userId, Note note, Long blockId, ConvertNoteToTaskRequest request) {
        NoteBlock block = noteBlockRepository.findByUserIdAndIdAndNoteIdForUpdate(userId, blockId, note.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Block with id " + blockId + " not found for note " + note.getId()));

        var existing = linkRepository.findByUserIdAndNoteIdAndNoteBlockIdAndLinkType(userId, note.getId(), block.getId(), ACTION_ITEM_LINK_TYPE);
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }
        String sourceText = firstNonBlank(request.selectedText(), block.getContent(), note.getBody(), note.getTitle());
        return writer.createActionItemTaskAndLink(note, block, request, sourceText);
    }

    private ConvertNoteToTaskResponse toResponse(NoteTaskLink link) {
        return new ConvertNoteToTaskResponse(taskApiMapper.toResponse(link.getTask()), linkMapper.toResponse(link));
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
