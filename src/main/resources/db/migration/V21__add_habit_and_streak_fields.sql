ALTER TABLE tasks ADD COLUMN daily_target_count INTEGER;

ALTER TABLE recurrence_rules ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recurrence_rules ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;
