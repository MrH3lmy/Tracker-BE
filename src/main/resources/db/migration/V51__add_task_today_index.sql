-- The "scheduled for today" bucket of GET /tasks/today and GET /projects/{id}/today (issue #286)
-- filters on (user_id, start_date). The existing idx_tasks_start_date index isn't led by user_id,
-- so - like V47 already did for due_date/status/project_id - add a composite index matching the
-- actual query shape instead of relying on a single-column index for a query that's always scoped
-- to one user first.
CREATE INDEX idx_tasks_user_id_start_date ON tasks (user_id, start_date);
