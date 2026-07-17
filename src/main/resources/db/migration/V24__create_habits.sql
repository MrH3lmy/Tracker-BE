CREATE TABLE habits (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    area VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
    important BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_minutes INTEGER,
    daily_target_count INTEGER NOT NULL DEFAULT 1,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recurrence_rule_id BIGINT UNIQUE,
    CONSTRAINT fk_habits_recurrence_rule
        FOREIGN KEY (recurrence_rule_id)
        REFERENCES recurrence_rules(id)
);

CREATE INDEX idx_habits_area ON habits(area);
CREATE INDEX idx_habits_deleted ON habits(deleted);

CREATE TABLE habit_check_ins (
    id BIGSERIAL PRIMARY KEY,
    habit_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_habit_check_ins_habit
        FOREIGN KEY (habit_id)
        REFERENCES habits(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_habit_check_ins_habit_date ON habit_check_ins(habit_id, check_in_date);

CREATE TABLE habit_schedules (
    id BIGSERIAL PRIMARY KEY,
    habit_id BIGINT NOT NULL UNIQUE,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    priority_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_habit_schedules_habit
        FOREIGN KEY (habit_id)
        REFERENCES habits(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_habit_schedules_scheduled_date ON habit_schedules(scheduled_date);

-- Migrate existing "habit-style" tasks (recurring AND carrying a daily check-in target) into the new
-- Habit entity, taking over their existing recurrence rule (and therefore its streak history), their
-- check-in history, and any existing schedule slot. A task with a daily_target_count but NO recurrence
-- is a one-off repetition checklist, not a habit, and is intentionally left as a plain task (it just
-- loses the per-day check-in target - a narrow edge case).
DO $$
DECLARE
    r RECORD;
    new_habit_id BIGINT;
BEGIN
    FOR r IN
        SELECT * FROM tasks WHERE daily_target_count IS NOT NULL AND recurrence_rule_id IS NOT NULL
    LOOP
        INSERT INTO habits (title, description, area, important, estimated_minutes, daily_target_count, deleted, created_at, recurrence_rule_id)
        VALUES (r.title, r.description, r.area, r.important, r.estimated_minutes, r.daily_target_count, r.deleted, r.created_at, r.recurrence_rule_id)
        RETURNING id INTO new_habit_id;

        INSERT INTO habit_check_ins (habit_id, check_in_date, checked_in_at)
        SELECT new_habit_id, check_in_date, checked_in_at FROM task_check_ins WHERE task_id = r.id;

        INSERT INTO habit_schedules (habit_id, scheduled_date, start_time, duration_minutes, priority_level, created_at)
        SELECT new_habit_id, scheduled_date, start_time, duration_minutes, priority_level, created_at FROM task_schedules WHERE task_id = r.id;

        DELETE FROM tasks WHERE id = r.id;
    END LOOP;
END $$;

ALTER TABLE tasks DROP COLUMN daily_target_count;
DROP TABLE task_check_ins;
