CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    content_type VARCHAR(40) NOT NULL DEFAULT 'PLAIN_TEXT',
    task_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_notes_task_id ON notes(task_id);
CREATE INDEX idx_notes_content_type ON notes(content_type);
CREATE INDEX idx_notes_created_at ON notes(created_at);
