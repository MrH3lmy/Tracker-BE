-- Issue #287: meeting-note action item -> task workflow.
--
-- sourceNoteId gives a task real traceability back to the note it was converted from (rather than
-- only a free-text "Created from note XYZ" in the description). Same shape as tasks.project_id:
-- plain nullable FK, ON DELETE SET NULL, plus the V42-style composite tenant FK.
ALTER TABLE tasks ADD COLUMN source_note_id BIGINT REFERENCES notes(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_source_note_id ON tasks (source_note_id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_owned_source_note FOREIGN KEY (user_id, source_note_id) REFERENCES notes (user_id, id);

-- Duplicate-conversion protection: converting the same meeting-note action item (a specific
-- note_block_id) more than once must not create a second task. This is a DB-level invariant, not
-- just an application-level check-then-insert, so it holds even under concurrent duplicate
-- requests. Scoped to link_type = 'ACTION_ITEM_CONVERSION' and note_block_id IS NOT NULL only -
-- plain MENTION links and whole-note/free-text conversions (note_block_id IS NULL) are untouched
-- and keep their existing (unrestricted) behavior.
CREATE UNIQUE INDEX uq_note_task_links_action_item ON note_task_links (user_id, note_id, note_block_id)
    WHERE link_type = 'ACTION_ITEM_CONVERSION' AND note_block_id IS NOT NULL;
