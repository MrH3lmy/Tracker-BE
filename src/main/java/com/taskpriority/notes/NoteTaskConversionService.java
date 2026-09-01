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
import org.springframework.dao.DataIntegrityViolationException;
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
            NoteBlock block = noteBlockRepository.findByUserIdAndIdAndNoteId(userId, request.noteBlockId(), noteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Block with id " + request.noteBlockId() + " not found for note " + noteId));
            return convertActionItem(userId, note, block, request);
        }

        String sourceText = firstNonBlank(request.selectedText(), note.getBody(), note.getTitle());
        return writer.createFreeTextTaskAndLink(note, request, sourceText);
    }

    /**
     * Idempotent per (note, block): a fast-path pre-check returns the existing task/link when one
     * is already visible. When it isn't (first request, or a concurrent request that hasn't
     * committed yet), {@link NoteTaskConversionWriter#createActionItemTaskAndLink} attempts the
     * insert in its own nested transaction; if a competing request wins the race, that insert
     * fails against V53's partial unique index and rolls back on its own without touching this
     * (outer) transaction, which is then free to re-read the canonical row the winner committed
     * and hand the caller that instead of letting the error surface. Two concurrent callers
     * therefore always resolve to the same task/link, never a duplicate and never a 4xx/5xx purely
     * because they raced.
     */
    private ConvertNoteToTaskResponse convertActionItem(Long userId, Note note, NoteBlock block, ConvertNoteToTaskRequest request) {
        var existing = linkRepository.findByUserIdAndNoteIdAndNoteBlockIdAndLinkType(userId, note.getId(), block.getId(), ACTION_ITEM_LINK_TYPE);
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }
        String sourceText = firstNonBlank(request.selectedText(), block.getContent(), note.getBody(), note.getTitle());
        try {
            return writer.createActionItemTaskAndLink(note, block, request, sourceText);
        } catch (DataIntegrityViolationException lostTheRace) {
            NoteTaskLink canonical = linkRepository.findByUserIdAndNoteIdAndNoteBlockIdAndLinkType(userId, note.getId(), block.getId(), ACTION_ITEM_LINK_TYPE)
                    .orElseThrow(() -> lostTheRace);
            return toResponse(canonical);
        }
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
