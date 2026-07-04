CREATE TABLE note_blocks (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL,
    content TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_blocks_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX idx_note_blocks_note_position ON note_blocks(note_id, position);
CREATE INDEX idx_note_blocks_type ON note_blocks(type);
