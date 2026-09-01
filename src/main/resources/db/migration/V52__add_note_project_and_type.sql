-- Issue #287: notes become optionally project-scoped, and gain a machine-readable type instead of
-- being a generic bucket of text.
--
-- project_id follows the exact same shape as tasks.project_id (V35/V42): a plain nullable FK,
-- ON DELETE SET NULL so deleting a project never deletes its notes, plus the composite
-- (user_id, project_id) -> projects(user_id, id) tenant-isolation FK from the V42 pattern. The
-- simple FK's ON DELETE SET NULL fires first and nulls project_id before the composite FK (which
-- has no ON DELETE clause, so defaults to NO ACTION) is checked - same ordering V42 already
-- relies on for tasks.project_id, so no extra ON DELETE handling is needed here.
ALTER TABLE notes ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_project_id ON notes (project_id);
ALTER TABLE notes ADD CONSTRAINT fk_notes_owned_project FOREIGN KEY (user_id, project_id) REFERENCES projects (user_id, id);

-- note_type is NOT NULL with a DEFAULT, so Postgres backfills every existing row to GENERAL as
-- part of this single metadata-only ALTER (no separate UPDATE statement needed).
ALTER TABLE notes ADD COLUMN note_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL';
CREATE INDEX idx_notes_note_type ON notes (note_type);
