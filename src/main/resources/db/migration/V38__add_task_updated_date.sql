-- Needed for weekly-review "stale task" detection (active tasks untouched
-- for 14+ days). Existing rows backfill to their created_at via the column
-- default; every future INSERT/UPDATE keeps it current via Task's JPA
-- lifecycle callback.
ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE tasks SET updated_at = created_at;
CREATE INDEX idx_tasks_updated_at ON tasks (updated_at);
