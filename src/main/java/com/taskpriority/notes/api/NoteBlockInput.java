package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * One structured block as sent by the note page editor (issue #299 follow-up).
 *
 * <p>{@code id} is the crux of the contract: a block the client already knows about sends its
 * real {@code note_blocks.id} back, and {@link com.taskpriority.notes.NoteService} then *updates*
 * that row rather than deleting and re-inserting it. That matters because
 * {@code note_task_links.note_block_id} is {@code ON DELETE CASCADE} (V14), with a unique index on
 * {@code (user_id, note_id, note_block_id)} for {@code ACTION_ITEM_CONVERSION} links (V53): a
 * delete-all-then-reinsert save would silently destroy every structured action's task link and the
 * idempotency guarantee built on it (issues #287/#296). A {@code null} id means "this is a new
 * block, insert it".
 *
 * <p>Position is deliberately absent - it is derived from this list's order, so the client cannot
 * send an ordering that disagrees with the array it just rendered.
 */
public record NoteBlockInput(
        @Positive(message = "id must be greater than 0")
        Long id,

        @NotBlank(message = "is required")
        @Size(max = 40, message = "must be at most 40 characters")
        String type,

        String content,

        boolean checked,

        @Size(max = 2000, message = "metadata must be at most 2000 characters")
        String metadata
) {
}
