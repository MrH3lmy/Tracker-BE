ALTER TABLE tasks ADD COLUMN reminder_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN reminder_sent_at TIMESTAMP;

CREATE INDEX idx_tasks_reminder_at ON tasks(reminder_at);
CREATE INDEX idx_tasks_due_reminders
    ON tasks(reminder_enabled, reminder_sent, reminder_at, status);
