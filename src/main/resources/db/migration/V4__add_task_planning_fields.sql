ALTER TABLE tasks ADD COLUMN start_date DATE;
ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN actual_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW';
ALTER TABLE tasks ADD COLUMN risk_reason VARCHAR(500);
ALTER TABLE tasks ADD COLUMN track VARCHAR(120);
ALTER TABLE tasks ADD COLUMN parent_task_id BIGINT;

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_estimated_minutes_non_negative
    CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0);

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_actual_minutes_non_negative
    CHECK (actual_minutes IS NULL OR actual_minutes >= 0);

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_planning_dates
    CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_not_own_parent
    CHECK (parent_task_id IS NULL OR parent_task_id <> id);

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_parent_task
    FOREIGN KEY (parent_task_id)
    REFERENCES tasks(id)
    ON DELETE SET NULL;

CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_risk_level ON tasks(risk_level);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
