package com.taskpriority.notes.ai;

import com.taskpriority.model.NoteAiAction;

public interface AiNoteActionProvider {
    String providerName();
    String modelName();
    String generate(NoteAiAction action, String title, String body);
}
