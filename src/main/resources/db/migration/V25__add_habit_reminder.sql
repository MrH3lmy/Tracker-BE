ALTER TABLE habits
    ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN reminder_time TIME;
