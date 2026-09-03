package com.taskpriority.notes.api;

import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.NoteType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateNoteRequest(
        @NotBlank(message = "is required")
        @Size(max = 255, message = "must be at most 255 characters")
        String title,

        // Not @NotBlank: the note page editor (issue #299 follow-up) can legitimately hold an
        // empty document - a note created by "New note" before the user types, or one whose
        // content they just cleared. Autosaving either must not 400. Title stays required.
        @NotNull(message = "is required")
        String body,

        @NotNull(message = "is required")
        NoteContentType contentType,

        @Positive(message = "taskId must be greater than 0")
        Long taskId,

        @Positive(message = "collectionId must be greater than 0")
        Long collectionId,

        @Positive(message = "projectId must be greater than 0")
        Long projectId,

        NoteType noteType,

        Integer displayOrder,

        Integer positionX,

        Integer positionY,

        Integer width,

        Integer height,

        @Size(max = 40, message = "color must be at most 40 characters")
        String color,

        Integer zIndex,

        @Size(max = 20, message = "tags must contain at most 20 items")
        List<@Size(max = 80, message = "tag must be at most 80 characters") String> tags,

        /**
         * Structured blocks to persist alongside this note, applied as an id-preserving diff in
         * the same transaction as the note itself (issue #299 follow-up). {@code null} - which is
         * what every pre-existing caller sends - leaves {@code note_blocks} completely untouched,
         * so this field is backwards compatible.
         */
        @Valid
        @Size(max = 500, message = "blocks must contain at most 500 items")
        List<NoteBlockInput> blocks,

        /**
         * Marks this update as an editor autosave rather than a deliberate save. It changes
         * nothing about what is written - only whether a version snapshot is taken: an autosave
         * relies purely on the time debounce instead of also snapshotting on every title, tag,
         * content-type or 120-character body change. Without this, a Notion-style editor would
         * mint a version every few keystrokes and make version history useless. Absent/false
         * keeps the exact pre-existing behaviour.
         */
        Boolean autosave
) {
}
