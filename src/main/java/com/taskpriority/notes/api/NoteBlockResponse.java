package com.taskpriority.notes.api;

/**
 * A note's persisted structured blocks (issue #296). Only populated for notes created from a
 * template or restored from a version snapshot - {@code NoteService.update} never writes
 * {@code note_blocks} for the free-text body, so a note edited only through the plain body field
 * has none. Exposing {@code id} here is what lets the client send it back as
 * {@link ConvertNoteToTaskRequest#noteBlockId()} for the idempotent structured-action conversion
 * (issue #287) - before this field existed, a real {@code NoteBlock} row's id was never returned
 * to the client by any endpoint, so the UI had no way to use that contract at all.
 */
public record NoteBlockResponse(
        Long id,
        String type,
        String content,
        int position,
        boolean checked,
        String metadata
) {
}
