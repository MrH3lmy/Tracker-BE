CREATE TABLE note_ai_generations (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    model VARCHAR(120),
    generated_content TEXT NOT NULL,
    source_hash VARCHAR(64) NOT NULL,
    generated BOOLEAN NOT NULL DEFAULT TRUE,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    audit_metadata TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_note_ai_generations_note_id ON note_ai_generations (note_id);
CREATE INDEX idx_note_ai_generations_action ON note_ai_generations (action);
CREATE INDEX idx_note_ai_generations_created_at ON note_ai_generations (created_at);
