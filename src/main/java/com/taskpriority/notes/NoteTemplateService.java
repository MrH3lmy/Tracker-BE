package com.taskpriority.notes;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Note;
import com.taskpriority.model.NoteBlock;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.NoteTemplate;
import com.taskpriority.notes.api.CreateNoteFromTemplateRequest;
import com.taskpriority.notes.api.CreateNoteRequest;
import com.taskpriority.notes.api.NoteResponse;
import com.taskpriority.notes.api.NoteTemplateResponse;
import com.taskpriority.repository.NoteBlockRepository;
import com.taskpriority.repository.NoteTemplateRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class NoteTemplateService implements ApplicationRunner {
    private final NoteTemplateRepository noteTemplateRepository;
    private final NoteBlockRepository noteBlockRepository;
    private final NoteService noteService;
    private final ObjectMapper objectMapper;

    public NoteTemplateService(NoteTemplateRepository noteTemplateRepository, NoteBlockRepository noteBlockRepository, NoteService noteService, ObjectMapper objectMapper) {
        this.noteTemplateRepository = noteTemplateRepository;
        this.noteBlockRepository = noteBlockRepository;
        this.noteService = noteService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        defaultTemplates().forEach(template -> {
            if (!noteTemplateRepository.existsByName(template.getName())) noteTemplateRepository.save(template);
        });
    }

    @Transactional(readOnly = true)
    public List<NoteTemplateResponse> findAll() {
        return noteTemplateRepository.findAllByOrderByCategoryAscNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public NoteResponse createNoteFromTemplate(CreateNoteFromTemplateRequest request) {
        NoteTemplate template = noteTemplateRepository.findById(request.templateId())
                .orElseThrow(() -> new ResourceNotFoundException("Note template with id " + request.templateId() + " not found"));
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("date", LocalDate.now().toString());
        variables.put("taskTitle", "");
        variables.put("area", "");
        variables.put("priority", "");
        variables.put("dueDate", "");
        if (request.variables() != null) variables.putAll(request.variables());

        String title = request.title() == null || request.title().isBlank() ? render(template.getName(), variables) : render(request.title(), variables);
        String body = render(template.getContent(), variables);
        NoteResponse created = noteService.create(new CreateNoteRequest(title, body, NoteContentType.MARKDOWN, request.taskId(), null, null, null, null, null, null, null, null, request.tags()));
        createBlocks(created.id(), template.getBlocksJson(), variables);
        return noteService.findById(created.id());
    }

    private void createBlocks(Long noteId, String blocksJson, Map<String, String> variables) {
        if (blocksJson == null || blocksJson.isBlank()) return;
        try {
            List<Map<String, Object>> blocks = objectMapper.readValue(blocksJson, new TypeReference<>() {});
            Note note = new Note();
            note.setId(noteId);
            for (int i = 0; i < blocks.size(); i++) {
                Map<String, Object> source = blocks.get(i);
                NoteBlock block = new NoteBlock();
                block.setNote(note);
                block.setType(String.valueOf(source.getOrDefault("type", "paragraph")));
                block.setContent(render(String.valueOf(source.getOrDefault("content", "")), variables));
                block.setChecked(Boolean.TRUE.equals(source.get("checked")));
                block.setMetadata(source.get("metadata") == null ? null : objectMapper.writeValueAsString(source.get("metadata")));
                block.setPosition(i);
                noteBlockRepository.save(block);
            }
        } catch (Exception ignored) {
            // Template body remains the source of truth if block JSON is malformed.
        }
    }

    private String render(String value, Map<String, String> variables) {
        String rendered = value == null ? "" : value;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return rendered;
    }

    private NoteTemplateResponse toResponse(NoteTemplate template) {
        return new NoteTemplateResponse(template.getId(), template.getName(), template.getDescription(), template.getCategory(), template.getContent(), template.getBlocksJson(), template.getCreatedAt(), template.getUpdatedAt());
    }

    private List<NoteTemplate> defaultTemplates() {
        return List.of(
                template("Daily plan", "Plan today around priorities and due dates.", "Planning", "# Daily plan — {{date}}\n\n## Top priorities\n- {{taskTitle}}\n\n## Schedule\n- \n\n## Notes\n- Area: {{area}}\n- Priority: {{priority}}\n- Due: {{dueDate}}"),
                template("Meeting notes", "Capture agenda, attendees, decisions, and action items.", "Meetings", "# Meeting notes — {{date}}\n\n## Attendees\n- \n\n## Agenda\n- {{taskTitle}}\n\n## Decisions\n- \n\n## Action items\n- [ ] "),
                template("Bug investigation", "Structure reproduction, impact, cause, and fix notes.", "Engineering", "# Bug investigation: {{taskTitle}}\n\n## Summary\n\n## Reproduction\n1. \n\n## Expected\n\n## Actual\n\n## Suspected cause\n\n## Fix plan\n- Priority: {{priority}}\n- Due: {{dueDate}}"),
                template("Project kickoff", "Align goals, stakeholders, scope, and next steps.", "Projects", "# Project kickoff: {{taskTitle}}\n\n## Goal\n\n## Scope\n\n## Stakeholders\n\n## Milestones\n- Due: {{dueDate}}\n\n## Risks\n\n## Next steps\n- [ ] "),
                template("Decision log", "Record context, options, decision, and consequences.", "Planning", "# Decision log — {{date}}\n\n## Context\n\n## Options considered\n- \n\n## Decision\n\n## Consequences\n\n## Review date\n{{dueDate}}"),
                template("Retrospective", "Review what worked, what did not, and improvements.", "Team", "# Retrospective — {{date}}\n\n## Went well\n- \n\n## Could improve\n- \n\n## Lessons learned\n- \n\n## Actions\n- [ ] "),
                template("Task breakdown", "Break a task into subtasks, risks, and acceptance criteria.", "Tasks", "# Task breakdown: {{taskTitle}}\n\n## Outcome\n\n## Subtasks\n- [ ] \n\n## Acceptance criteria\n- \n\n## Risks / blockers\n- Area: {{area}}\n- Priority: {{priority}}\n- Due: {{dueDate}}")
        );
    }

    private NoteTemplate template(String name, String description, String category, String content) {
        NoteTemplate template = new NoteTemplate();
        template.setName(name);
        template.setDescription(description);
        template.setCategory(category);
        template.setContent(content);
        try {
            List<Map<String, String>> blocks = content.lines().map(line -> Map.of("type", line.startsWith("#") ? "heading" : line.startsWith("- [ ]") ? "checklist" : line.startsWith("-") ? "bullet" : "paragraph", "content", line)).toList();
            template.setBlocksJson(objectMapper.writeValueAsString(blocks));
        } catch (Exception ignored) {
            template.setBlocksJson(null);
        }
        return template;
    }
}
