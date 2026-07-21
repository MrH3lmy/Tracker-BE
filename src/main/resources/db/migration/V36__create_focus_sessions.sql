CREATE TABLE focus_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    note TEXT,
    actual_minutes INTEGER
);

CREATE INDEX idx_focus_sessions_user_id ON focus_sessions (user_id);
CREATE INDEX idx_focus_sessions_task_id ON focus_sessions (task_id);
CREATE INDEX idx_focus_sessions_started_at ON focus_sessions (started_at);

CREATE TABLE focus_session_pauses (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    paused_at TIMESTAMP NOT NULL,
    resumed_at TIMESTAMP
);

CREATE INDEX idx_focus_session_pauses_session_id ON focus_session_pauses (session_id);
