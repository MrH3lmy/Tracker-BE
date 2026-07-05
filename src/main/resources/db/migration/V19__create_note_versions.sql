CREATE TABLE note_versions (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    content_type VARCHAR(40) NOT NULL,
    blocks_json TEXT,
    tags TEXT,
    editor_metadata TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_versions_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX idx_note_versions_note_created ON note_versions(note_id, created_at DESC, id DESC);
