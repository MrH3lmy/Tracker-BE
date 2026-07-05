package com.taskpriority.notes.ai;

import com.taskpriority.model.NoteAiAction;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class HeuristicAiNoteActionProvider implements AiNoteActionProvider {
    @Override public String providerName() { return "local-heuristic"; }
    @Override public String modelName() { return "rules-v1"; }

    @Override
    public String generate(NoteAiAction action, String title, String body) {
        String text = body == null ? "" : body.strip();
        List<String> sentences = Arrays.stream(text.split("(?<=[.!?])\\s+|\\R+"))
                .map(String::strip).filter(s -> !s.isBlank()).limit(8).toList();
        return switch (action) {
            case SUMMARIZE -> sentences.isEmpty() ? "No content to summarize." : "Summary:\n- " + String.join("\n- ", sentences.stream().limit(3).toList());
            case EXTRACT_TASKS -> extractMatching(sentences, "Tasks to review", "(?i).*(todo|task|follow up|next|action|must|should|need|assign).*", "- [ ] ");
            case EXTRACT_DECISIONS -> extractMatching(sentences, "Decisions to review", "(?i).*(decided|decision|agreed|approved|rejected|chosen|resolved).*", "- ");
            case REWRITE -> "Rewrite suggestion:\n" + text.replaceAll("\\s+", " ").strip();
            case CREATE_TASK_PLAN -> "Task plan (review before creating tasks):\n" + (sentences.isEmpty() ? "- [ ] Define the first actionable step for " + title : String.join("\n", sentences.stream().limit(5).map(s -> "- [ ] " + s).toList()));
        };
    }

    private String extractMatching(List<String> sentences, String heading, String pattern, String prefix) {
        List<String> matches = sentences.stream().filter(s -> s.matches(pattern)).toList();
        if (matches.isEmpty()) return heading + ":\n- No obvious items found. Review the note manually.";
        return heading + ":\n" + String.join("\n", matches.stream().map(s -> prefix + s).toList());
    }
}
