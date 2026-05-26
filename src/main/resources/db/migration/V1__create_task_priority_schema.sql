CREATE TABLE recurrence_rules (
    id BIGSERIAL PRIMARY KEY,
    frequency VARCHAR(20) NOT NULL,
    rule_interval INTEGER NOT NULL DEFAULT 1,
    day_of_month INTEGER,
    annual_date VARCHAR(10),
    next_due_date DATE,
    last_completed_date DATE
);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    important BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL,
    area VARCHAR(20) NOT NULL,
    effort VARCHAR(20) NOT NULL,
    blocked_reason VARCHAR(255),
    waiting_on VARCHAR(255),
    follow_up_date DATE,
    recurrence_rule_id BIGINT UNIQUE,
    CONSTRAINT fk_tasks_recurrence_rule
        FOREIGN KEY (recurrence_rule_id)
        REFERENCES recurrence_rules(id)
);

CREATE TABLE recurrence_rule_days (
    recurrence_rule_id BIGINT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    CONSTRAINT fk_recurrence_rule_days_rule
        FOREIGN KEY (recurrence_rule_id)
        REFERENCES recurrence_rules(id)
        ON DELETE CASCADE
);

CREATE TABLE app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL
);

CREATE TABLE priority_scoring_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value INTEGER NOT NULL
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_follow_up_date ON tasks(follow_up_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_area ON tasks(area);
CREATE INDEX idx_tasks_effort ON tasks(effort);
CREATE INDEX idx_tasks_important ON tasks(important);
CREATE INDEX idx_tasks_deleted ON tasks(deleted);
