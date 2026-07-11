package com.taskpriority.notes.ai;

import com.taskpriority.model.NoteAiAction;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HeuristicAiNoteActionProviderTest {

    private final HeuristicAiNoteActionProvider provider = new HeuristicAiNoteActionProvider();

    @Test
    void reportsProviderAndModelName() {
        assertEquals("local-heuristic", provider.providerName());
        assertEquals("rules-v1", provider.modelName());
    }

    @Test
    void summarizeReturnsNoContentMessageForBlankBody() {
        String result = provider.generate(NoteAiAction.SUMMARIZE, "Title", "   ");
        assertEquals("No content to summarize.", result);
    }

    @Test
    void summarizeReturnsNoContentMessageForNullBody() {
        String result = provider.generate(NoteAiAction.SUMMARIZE, "Title", null);
        assertEquals("No content to summarize.", result);
    }

    @Test
    void summarizeLimitsToFirstThreeSentences() {
        String body = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.";
        String result = provider.generate(NoteAiAction.SUMMARIZE, "Title", body);
        assertEquals("Summary:\n- First sentence.\n- Second sentence.\n- Third sentence.", result);
    }

    @Test
    void summarizeSplitsOnNewlinesToo() {
        String body = "Line one\nLine two\nLine three";
        String result = provider.generate(NoteAiAction.SUMMARIZE, "Title", body);
        assertEquals("Summary:\n- Line one\n- Line two\n- Line three", result);
    }

    @Test
    void extractTasksFindsActionableSentences() {
        String body = "We had lunch. TODO: write the report. The weather was nice. We should follow up next week.";
        String result = provider.generate(NoteAiAction.EXTRACT_TASKS, "Title", body);
        assertTrue(result.startsWith("Tasks to review:\n"));
        assertTrue(result.contains("- [ ] TODO: write the report."));
        assertTrue(result.contains("- [ ] We should follow up next week."));
        assertFalse(result.contains("We had lunch."));
    }

    @Test
    void extractTasksReturnsFallbackWhenNoMatches() {
        String body = "Just a plain observation about the weather.";
        String result = provider.generate(NoteAiAction.EXTRACT_TASKS, "Title", body);
        assertEquals("Tasks to review:\n- No obvious items found. Review the note manually.", result);
    }

    @Test
    void extractDecisionsFindsDecisionSentences() {
        String body = "We discussed options. We decided to ship on Friday. It rained.";
        String result = provider.generate(NoteAiAction.EXTRACT_DECISIONS, "Title", body);
        assertTrue(result.startsWith("Decisions to review:\n"));
        assertTrue(result.contains("- We decided to ship on Friday."));
        assertFalse(result.contains("We discussed options."));
    }

    @Test
    void extractDecisionsReturnsFallbackWhenNoMatches() {
        String body = "Just a plain observation about the weather.";
        String result = provider.generate(NoteAiAction.EXTRACT_DECISIONS, "Title", body);
        assertEquals("Decisions to review:\n- No obvious items found. Review the note manually.", result);
    }

    @Test
    void rewriteCollapsesWhitespace() {
        String body = "  Line   one\n\n  Line   two  ";
        String result = provider.generate(NoteAiAction.REWRITE, "Title", body);
        assertEquals("Rewrite suggestion:\nLine one Line two", result);
    }

    @Test
    void createTaskPlanUsesTitleFallbackWhenBodyEmpty() {
        String result = provider.generate(NoteAiAction.CREATE_TASK_PLAN, "My Note", "");
        assertEquals("Task plan (review before creating tasks):\n- [ ] Define the first actionable step for My Note", result);
    }

    @Test
    void createTaskPlanListsUpToFiveSentencesAsChecklistItems() {
        String body = "One. Two. Three. Four. Five. Six.";
        String result = provider.generate(NoteAiAction.CREATE_TASK_PLAN, "Title", body);
        assertEquals(
                "Task plan (review before creating tasks):\n- [ ] One.\n- [ ] Two.\n- [ ] Three.\n- [ ] Four.\n- [ ] Five.",
                result);
    }
}
