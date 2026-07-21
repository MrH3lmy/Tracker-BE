-- Additive and nullable: existing track/phase free-text grouping keeps working
-- unchanged for anyone not using Projects. Deleting a project must not delete
-- its tasks, so this is ON DELETE SET NULL, not CASCADE.
ALTER TABLE tasks ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_project_id ON tasks (project_id);
