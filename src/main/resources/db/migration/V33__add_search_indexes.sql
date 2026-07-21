-- Supports GET /api/v1/search: case-insensitive title lookups scoped per user
-- across the three entity types it searches by free text.
CREATE INDEX idx_tasks_user_title ON tasks (user_id, lower(title));
CREATE INDEX idx_notes_user_title ON notes (user_id, lower(title));
CREATE INDEX idx_habits_user_title ON habits (user_id, lower(title));
