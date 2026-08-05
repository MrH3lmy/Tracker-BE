-- GET /api/v1/tasks and /api/v1/tasks/archive now paginate and filter in PostgreSQL instead of
-- loading a user's entire task history into Java and filtering/sorting there (issue #260). The
-- existing single-column indexes on status/project_id/due_date aren't useful for a query that's
-- always scoped to one user first - add composite indexes led by user_id matching the filter/sort
-- combinations those two endpoints actually use.
CREATE INDEX idx_tasks_user_id_status_position ON tasks (user_id, status, position);
CREATE INDEX idx_tasks_user_id_project_id ON tasks (user_id, project_id);
CREATE INDEX idx_tasks_user_id_due_date ON tasks (user_id, due_date);
