CREATE TABLE note_collections (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    color VARCHAR(40),
    icon VARCHAR(80),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_note_collections_name ON note_collections (name);

ALTER TABLE notes ADD COLUMN collection_id BIGINT;
ALTER TABLE notes ADD CONSTRAINT fk_notes_collection FOREIGN KEY (collection_id) REFERENCES note_collections(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_collection_id ON notes (collection_id);
