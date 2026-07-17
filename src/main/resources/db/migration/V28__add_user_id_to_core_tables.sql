-- Adds a nullable user_id FK to every entity table that is not yet account-scoped.
-- Nullable and unenforced for now (see V29 for backfill + NOT NULL) so this migration
-- is a safe, no-behavior-change deploy on its own.

ALTER TABLE tasks ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_tasks_user_id ON tasks (user_id);

ALTER TABLE boards ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_boards_user_id ON boards (user_id);

ALTER TABLE board_columns ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_board_columns_user_id ON board_columns (user_id);

ALTER TABLE task_dependencies ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_task_dependencies_user_id ON task_dependencies (user_id);

ALTER TABLE task_schedules ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_task_schedules_user_id ON task_schedules (user_id);

ALTER TABLE task_check_ins ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_task_check_ins_user_id ON task_check_ins (user_id);

ALTER TABLE habits ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_habits_user_id ON habits (user_id);

ALTER TABLE habit_schedules ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_habit_schedules_user_id ON habit_schedules (user_id);

ALTER TABLE habit_check_ins ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_habit_check_ins_user_id ON habit_check_ins (user_id);

ALTER TABLE notes ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_notes_user_id ON notes (user_id);

ALTER TABLE tags ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_tags_user_id ON tags (user_id);

ALTER TABLE note_collections ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_collections_user_id ON note_collections (user_id);

ALTER TABLE note_templates ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_templates_user_id ON note_templates (user_id);

ALTER TABLE note_saved_views ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_saved_views_user_id ON note_saved_views (user_id);

ALTER TABLE note_attachments ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_attachments_user_id ON note_attachments (user_id);

ALTER TABLE note_blocks ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_blocks_user_id ON note_blocks (user_id);

ALTER TABLE note_task_links ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_task_links_user_id ON note_task_links (user_id);

ALTER TABLE note_ai_generations ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_ai_generations_user_id ON note_ai_generations (user_id);

ALTER TABLE note_versions ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_note_versions_user_id ON note_versions (user_id);
