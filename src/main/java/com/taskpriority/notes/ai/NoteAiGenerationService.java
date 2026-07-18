package com.taskpriority.notes.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.entitlement.EntitlementService;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteAiGeneration;
import com.taskpriority.notes.api.NoteAiGenerationResponse;
import com.taskpriority.notes.api.RunNoteAiActionRequest;
import com.taskpriority.repository.NoteAiGenerationRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.settings.SettingsService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoteAiGenerationService {
    private final NoteRepository noteRepository;
    private final NoteAiGenerationRepository generationRepository;
    private final AiNoteActionProvider provider;
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;
    private final CurrentUserService currentUserService;
    private final EntitlementService entitlementService;

    public NoteAiGenerationService(NoteRepository noteRepository, NoteAiGenerationRepository generationRepository, AiNoteActionProvider provider, SettingsService settingsService, ObjectMapper objectMapper, CurrentUserService currentUserService, EntitlementService entitlementService) {
        this.noteRepository = noteRepository;
        this.generationRepository = generationRepository;
        this.provider = provider;
        this.settingsService = settingsService;
        this.objectMapper = objectMapper;
        this.currentUserService = currentUserService;
        this.entitlementService = entitlementService;
    }

    @Transactional(readOnly = true)
    public List<NoteAiGenerationResponse> findByNote(Long noteId) {
        Long userId = currentUserService.requireUserId();
        if (!noteRepository.existsByUserIdAndId(userId, noteId)) throw new ResourceNotFoundException("Note with id " + noteId + " not found");
        return generationRepository.findByUserIdAndNoteIdOrderByCreatedAtDescIdDesc(userId, noteId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteAiGenerationResponse run(Long noteId, RunNoteAiActionRequest request) {
        if (!settingsService.isAiFeaturesEnabled()) throw new IllegalArgumentException("AI note features are disabled in settings.");
        Long userId = currentUserService.requireUserId();
        entitlementService.assertWithinAiQuota();
        Note note = noteRepository.findByUserIdAndId(userId, noteId).orElseThrow(() -> new ResourceNotFoundException("Note with id " + noteId + " not found"));
        String content = provider.generate(request.action(), note.getTitle(), note.getBody());
        NoteAiGeneration generation = new NoteAiGeneration();
        generation.setUserId(userId);
        generation.setNote(note);
        generation.setAction(request.action());
        generation.setProvider(provider.providerName());
        generation.setModel(provider.modelName());
        generation.setGeneratedContent(content);
        generation.setSourceHash(sha256(note.getBody() == null ? "" : note.getBody()));
        generation.setGenerated(true);
        generation.setApplied(false);
        generation.setAuditMetadata(auditMetadata(request, note));
        return toResponse(generationRepository.save(generation));
    }

    private String auditMetadata(RunNoteAiActionRequest request, Note note) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "generated", true,
                    "action", request.action().name(),
                    "provider", provider.providerName(),
                    "model", provider.modelName(),
                    "noteId", note.getId(),
                    "generatedAt", LocalDateTime.now().toString(),
                    "reviewRequired", true,
                    "autoCreatesTasks", false
            ));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Unable to serialize AI audit metadata.");
        }
    }

    private String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 unavailable", ex); }
    }

    private NoteAiGenerationResponse toResponse(NoteAiGeneration generation) {
        return new NoteAiGenerationResponse(generation.getId(), generation.getNote().getId(), generation.getAction(), generation.getProvider(), generation.getModel(), generation.getGeneratedContent(), generation.getSourceHash(), generation.isGenerated(), generation.isApplied(), generation.getAuditMetadata(), generation.getCreatedAt());
    }
}
