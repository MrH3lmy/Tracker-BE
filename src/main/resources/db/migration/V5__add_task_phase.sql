ALTER TABLE tasks ADD COLUMN phase VARCHAR(120);

CREATE INDEX idx_tasks_track ON tasks(track);
CREATE INDEX idx_tasks_phase ON tasks(phase);
