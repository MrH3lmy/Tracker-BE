package com.taskpriority.notes;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.notes.api.CreateNoteBlockRequest;
import com.taskpriority.notes.api.NoteBlockResponse;
import com.taskpriority.notes.api.ReorderNoteBlocksRequest;
import com.taskpriority.notes.api.UpdateNoteBlockRequest;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class NoteBlockService {
    private static final Set<String> ALLOWED_TYPES = Set.of("paragraph", "heading", "checklist", "bullet", "code", "quote", "divider", "screenshot");

    private final NoteRepository noteRepository;
    private final NoteBlockRepository noteBlockRepository;
    private final com.taskpriority.repository.NoteTaskLinkRepository noteTaskLinkRepository;
    private final NoteTaskLinkMapper noteTaskLinkMapper;
    private final NoteService noteService;

    public NoteBlockService(NoteRepository noteRepository, NoteBlockRepository noteBlockRepository, com.taskpriority.repository.NoteTaskLinkRepository noteTaskLinkRepository, NoteTaskLinkMapper noteTaskLinkMapper, NoteService noteService) {
        this.noteRepository = noteRepository;
        this.noteBlockRepository = noteBlockRepository;
        this.noteTaskLinkRepository = noteTaskLinkRepository;
        this.noteTaskLinkMapper = noteTaskLinkMapper;
        this.noteService = noteService;
    }

    @Transactional(readOnly = true)
    public List<NoteBlockResponse> findByNoteId(Long noteId) {
        requireNote(noteId);
        return toResponseBatch(noteBlockRepository.findByNoteIdOrderByPositionAscIdAsc(noteId));
    }

    @Transactional
    public NoteBlockResponse create(Long noteId, CreateNoteBlockRequest request) {
        Note note = requireNote(noteId);
        noteService.createVersionForNoteEdit(noteId, "block-create");
        NoteBlock block = new NoteBlock();
        block.setNote(note);
        block.setType(normalizeType(request.type()));
        block.setContent(request.content());
        block.setPosition(request.position() == null ? noteBlockRepository.countByNoteId(noteId) : Math.max(0, request.position()));
        block.setChecked(Boolean.TRUE.equals(request.checked()));
        block.setMetadata(request.metadata());
        return toResponse(noteBlockRepository.save(block));
    }

    @Transactional
    public NoteBlockResponse update(Long noteId, Long blockId, UpdateNoteBlockRequest request) {
        requireNote(noteId);
        noteService.createVersionForNoteEdit(noteId, "block-update");
        NoteBlock block = getBlock(noteId, blockId);
        if (request.type() != null) block.setType(normalizeType(request.type()));
        if (request.content() != null) block.setContent(request.content());
        if (request.position() != null) block.setPosition(Math.max(0, request.position()));
        if (request.checked() != null) block.setChecked(request.checked());
        if (request.metadata() != null) block.setMetadata(request.metadata());
        return toResponse(noteBlockRepository.save(block));
    }

    @Transactional
    public void delete(Long noteId, Long blockId) {
        requireNote(noteId);
        noteService.createVersionForNoteEdit(noteId, "block-delete");
        noteBlockRepository.delete(getBlock(noteId, blockId));
    }

    @Transactional
    public List<NoteBlockResponse> reorder(Long noteId, ReorderNoteBlocksRequest request) {
        requireNote(noteId);
        noteService.createVersionForNoteEdit(noteId, "block-reorder");
        List<NoteBlock> blocks = noteBlockRepository.findByNoteIdOrderByPositionAscIdAsc(noteId);
        Set<Long> ids = new HashSet<>(request.blockIds());
        if (ids.size() != request.blockIds().size() || !blocks.stream().map(NoteBlock::getId).collect(java.util.stream.Collectors.toSet()).equals(ids)) {
            throw new IllegalArgumentException("Reorder request must include each block for the note exactly once");
        }
        java.util.Map<Long, NoteBlock> byId = blocks.stream().collect(java.util.stream.Collectors.toMap(NoteBlock::getId, b -> b));
        for (int i = 0; i < request.blockIds().size(); i++) byId.get(request.blockIds().get(i)).setPosition(i);
        List<NoteBlock> saved = noteBlockRepository.saveAll(blocks).stream()
                .sorted(java.util.Comparator.comparing(NoteBlock::getPosition).thenComparing(NoteBlock::getId))
                .toList();
        return toResponseBatch(saved);
    }

    private Note requireNote(Long noteId) {
        return noteRepository.findById(noteId).orElseThrow(() -> new ResourceNotFoundException("Note with id " + noteId + " not found"));
    }

    private NoteBlock getBlock(Long noteId, Long blockId) {
        return noteBlockRepository.findByIdAndNoteId(blockId, noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Block with id " + blockId + " not found for note " + noteId));
    }

    private String normalizeType(String type) {
        String normalized = type == null ? "" : type.trim().toLowerCase(java.util.Locale.ROOT);
        if (!ALLOWED_TYPES.contains(normalized)) throw new IllegalArgumentException("Unsupported note block type: " + type);
        return normalized;
    }

    public NoteBlockResponse toResponse(NoteBlock block) {
        var links = noteTaskLinkRepository.findByNoteBlockId(block.getId()).stream().map(noteTaskLinkMapper::toResponse).toList();
        return buildResponse(block, links);
    }

    private List<NoteBlockResponse> toResponseBatch(List<NoteBlock> blocks) {
        if (blocks.isEmpty()) {
            return List.of();
        }
        List<Long> blockIds = blocks.stream().map(NoteBlock::getId).toList();
        Map<Long, List<com.taskpriority.notes.api.NoteTaskLinkResponse>> linksByBlock = noteTaskLinkRepository.findByNoteBlockIdIn(blockIds).stream()
                .collect(Collectors.groupingBy(link -> link.getNoteBlock().getId(),
                        Collectors.mapping(noteTaskLinkMapper::toResponse, Collectors.toList())));
        return blocks.stream()
                .map(block -> buildResponse(block, linksByBlock.getOrDefault(block.getId(), List.of())))
                .toList();
    }

    private NoteBlockResponse buildResponse(NoteBlock block, List<com.taskpriority.notes.api.NoteTaskLinkResponse> links) {
        return new NoteBlockResponse(block.getId(), block.getNote().getId(), block.getType(), block.getContent(), block.getPosition(), block.getChecked(), block.getMetadata(), block.getCreatedAt(), block.getUpdatedAt(), links);
    }
}
